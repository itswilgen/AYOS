<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\ServiceUpdate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * The provider activation fee: online checkout through PayMongo, confirmation (from the webhook, the provider's
 * return to AYOS, or an admin's review), and emails to the admins who manage payments.
 * Confirming is idempotent: a payment that is already confirmed is never counted twice.
 */
class ActivationPayments
{
    public function __construct(
        private readonly PayMongo $payMongo,
        private readonly PlatformSettings $settings,
        private readonly ProviderWorkspace $workspace,
        private readonly SecurityAuditLogger $audit,
    ) {}

    public function onlineEnabled(): bool
    {
        return $this->payMongo->configured() && (int) $this->settings->get('lifetime_activation_fee', 0) >= 1;
    }

    /**
     * Returns the PayMongo checkout url for this provider, reusing an unpaid online checkout they already started.
     */
    public function startCheckout(object $profile, Request $request): string
    {
        $fee = (int) $this->settings->get('lifetime_activation_fee', 0);
        abort_if($fee < 1, 409, 'Lifetime activation is not configured yet.');
        abort_if(DB::table('activation_payments')->where('provider_profile_id', $profile->id)->where('status', 'pending')->where('method', 'manual')->exists(),
            409, 'A payment reference is already awaiting review.');

        $open = DB::table('activation_payments')->where('provider_profile_id', $profile->id)->where('status', 'pending')
            ->where('method', 'paymongo')->where('amount', $fee)->whereNotNull('checkout_url')->orderByDesc('id')->first();
        if ($open) {
            return (string) $open->checkout_url;
        }

        $reference = 'AYOS-ACT-'.$profile->id.'-'.Str::upper(Str::random(8));
        $id = DB::table('activation_payments')->insertGetId([
            'provider_profile_id' => $profile->id, 'amount' => $fee, 'currency' => 'PHP', 'reference' => $reference,
            'method' => 'paymongo', 'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $frontend = rtrim((string) config('app.frontend_url'), '/');
        try {
            $session = $this->payMongo->createCheckout(
                'AYOS lifetime provider access', $fee * 100, $reference,
                $frontend.'/provider/access?payment=success', $frontend.'/provider/access?payment=cancelled',
                ['activation_payment_id' => (string) $id, 'provider_profile_id' => (string) $profile->id],
            );
        } catch (Throwable $exception) {
            DB::table('activation_payments')->where('id', $id)->delete();
            abort(502, $exception->getMessage());
        }
        DB::table('activation_payments')->where('id', $id)->update([
            'transaction_id' => $session['id'], 'checkout_url' => $session['checkout_url'], 'updated_at' => now(),
        ]);
        $this->audit->record('ACTIVATION_CHECKOUT_STARTED', $request->user()?->id, $request, ['payment_id' => $id, 'provider_profile_id' => (int) $profile->id, 'amount' => $fee]);

        return $session['checkout_url'];
    }

    /**
     * Asks PayMongo whether the provider's latest online checkout was paid, and confirms it if so.
     * This is how a local or delayed setup still activates the provider when the webhook has not arrived.
     */
    public function syncLatest(object $profile, Request $request): ?string
    {
        $payment = DB::table('activation_payments')->where('provider_profile_id', $profile->id)->where('method', 'paymongo')
            ->whereNotNull('transaction_id')->orderByDesc('id')->first();
        if (! $payment || $payment->status !== 'pending' || ! $this->payMongo->configured()) {
            return $payment?->status;
        }
        try {
            $session = $this->payMongo->retrieveCheckout((string) $payment->transaction_id);
        } catch (Throwable) {
            return 'pending';
        }

        return $this->confirmFromSession($session, $request) ? 'confirmed' : 'pending';
    }

    /**
     * Confirms the activation payment a paid PayMongo checkout session belongs to.
     *
     * @param  array<string, mixed>  $session  a checkout session `data` object
     */
    public function confirmFromSession(array $session, Request $request): bool
    {
        $paid = PayMongo::paidAmount($session);
        if ($paid < 1) {
            return false;
        }
        $payment = DB::table('activation_payments')->where('method', 'paymongo')->where('transaction_id', (string) ($session['id'] ?? ''))->first();
        if (! $payment) {
            return false;
        }
        if ($paid < (int) $payment->amount * 100) {
            report(new \RuntimeException("PayMongo session {$payment->transaction_id} paid {$paid} centavos, expected ".($payment->amount * 100).'.'));

            return false;
        }

        return $this->confirm((int) $payment->id, null, null, $request, 'PayMongo');
    }

    /**
     * Marks a pending payment confirmed and gives the provider lifetime access. Returns true when this call
     * confirmed it, false when it was already confirmed (so retries and duplicate webhooks do nothing).
     */
    public function confirm(int $paymentId, ?int $adminId, ?string $note, Request $request, string $via = 'admin review'): bool
    {
        $confirmed = DB::transaction(function () use ($paymentId, $adminId, $note, $request, $via): bool {
            $payment = DB::table('activation_payments')->where('id', $paymentId)->lockForUpdate()->first();
            abort_unless($payment, 404);
            if ($payment->status === 'confirmed') {
                return false;
            }
            abort_if($payment->status !== 'pending', 409, 'Only pending payments can be confirmed.');
            DB::table('provider_profiles')->where('id', $payment->provider_profile_id)->update(['access_kind' => 'lifetime', 'updated_at' => now()]);
            DB::table('activation_payments')->where('id', $paymentId)->update(['status' => 'confirmed', 'admin_note' => $note,
                'reviewed_by' => $adminId, 'reviewed_at' => $adminId ? now() : null, 'paid_at' => now(), 'updated_at' => now()]);
            $this->workspace->notify((int) $payment->provider_profile_id, 'Lifetime access active', 'Your activation payment was confirmed. Thank you!', '/provider/access');
            $this->audit->record('PAYMENT_CONFIRMED', $adminId, $request, ['payment_id' => $paymentId, 'provider_id' => (int) $payment->provider_profile_id,
                'amount' => (int) $payment->amount, 'via' => $via]);

            return true;
        });
        if ($confirmed && $via === 'PayMongo') {
            $this->emailAdmins($paymentId, 'Provider activated through PayMongo', 'A provider paid the activation fee online and now has lifetime access.');
        }

        return $confirmed;
    }

    /**
     * Emails every active administrator who can manage payments. Mail problems are reported, never shown to the provider.
     */
    public function emailAdmins(int $paymentId, string $subject, string $headline): void
    {
        DB::afterCommit(function () use ($paymentId, $subject, $headline): void {
            $row = DB::table('activation_payments as a')->join('provider_profiles as p', 'p.id', '=', 'a.provider_profile_id')
                ->where('a.id', $paymentId)->select('a.amount', 'a.method', 'a.reference', 'p.display_name')->first();
            if (! $row) {
                return;
            }
            $admins = User::query()->where('is_admin', true)->where('status', 'active')
                ->whereHas('roles.permissions', fn ($query) => $query->where('permissions.slug', 'payments.manage'))->get();
            $notification = new ServiceUpdate("AYOS: {$subject}", [
                $headline,
                "Provider: {$row->display_name}",
                'Amount: ₱'.number_format((int) $row->amount).' · '.($row->method === 'paymongo' ? 'PayMongo' : 'Manual transfer'),
                "Reference: {$row->reference}",
            ], 'Open activation payments', '/admin/payments');
            foreach ($admins as $admin) {
                try {
                    $admin->notify($notification);
                } catch (Throwable $exception) {
                    report($exception);
                }
            }
        });
    }
}
