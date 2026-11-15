<?php

namespace App\Services;

use App\Models\SecurityAudit;
use App\Models\ServiceLocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Self-service account deletion.
 *
 * The user row is anonymized, not deleted: nearly every table cascades on users, so a hard delete would also erase the
 * other party's records (a provider's jobs, the reviews they received, disputes, conversations) and lower a provider's
 * free-quota count. Personal data is erased instead; shared records stay, attached to "Deleted user", which the
 * Privacy Policy allows ("delete or anonymize ... unless we need them to settle disputes, prevent fraud ...").
 */
class AccountDeletion
{
    /** Jobs that are still between the customer and the provider. */
    private const OPEN_JOB = ['accepted', 'scheduled', 'in_progress', 'provider_finished'];

    private const OPEN_DISPUTE = ['open', 'in_review'];

    public function __construct(private ProviderWorkspace $workspace) {}

    /**
     * What must be finished before this account can be deleted. Empty when deletion may go ahead.
     *
     * @return list<string>
     */
    public function blockers(User $user): array
    {
        $blockers = [];
        $profileId = DB::table('provider_profiles')->where('user_id', $user->id)->value('id');

        if ($user->hasAdminAccess()) {
            $blockers[] = 'This is an administrator account. Ask another administrator to remove your admin role first.';
        }
        if (DB::table('provider_jobs')->where('customer_id', $user->id)->whereIn('status', self::OPEN_JOB)->exists()) {
            $blockers[] = 'You have a booked service that is not finished. Complete or cancel it in My requests first.';
        }
        if ($profileId && DB::table('provider_jobs')->where('provider_profile_id', $profileId)->whereIn('status', self::OPEN_JOB)->exists()) {
            $blockers[] = 'You have provider jobs that are not finished. Complete them in the provider workspace first.';
        }
        if (DB::table('service_disputes')->whereIn('status', self::OPEN_DISPUTE)
            ->where(fn ($query) => $query->where('customer_id', $user->id)->when($profileId, fn ($q) => $q->orWhere('provider_profile_id', $profileId)))
            ->exists()) {
            $blockers[] = 'A dispute about one of your services is still open. Wait for AYOS to resolve it first.';
        }

        return $blockers;
    }

    /** Erase this account's personal data. Call only when blockers() is empty. */
    public function delete(User $user): void
    {
        $privateFiles = [];
        $publicFiles = [];

        DB::transaction(function () use ($user, &$privateFiles, &$publicFiles): void {
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $profile = DB::table('provider_profiles')->where('user_id', $user->id)->lockForUpdate()->first();

            // Requests still waiting for a reply end cleanly instead of hanging on a deleted account.
            DB::table('service_requests')->where('customer_id', $user->id)->where('status', 'new')
                ->update(['status' => 'cancelled', 'updated_at' => now()]);
            if ($profile) {
                $waiting = DB::table('service_requests')->where('provider_profile_id', $profile->id)->where('status', 'new')->get(['id', 'customer_id']);
                DB::table('service_requests')->whereIn('id', $waiting->pluck('id'))->update(['status' => 'declined', 'updated_at' => now()]);
                $waiting->each(fn (object $request) => $this->workspace->notifyCustomer((int) $request->customer_id,
                    'Request declined', 'This provider closed their AYOS account. Please choose another provider.'));
            }

            // Addresses: drop unused ones; keep only the broad area of ones a past request points to.
            $usedLocations = DB::table('service_requests')->where('customer_id', $user->id)->distinct()->pluck('service_location_id');
            ServiceLocation::query()->where('user_id', $user->id)->whereNotIn('id', $usedLocations)->delete();
            ServiceLocation::query()->where('user_id', $user->id)->get()->each(fn (ServiceLocation $location) => $location
                ->forceFill(['label' => 'Deleted', 'address_line' => '', 'landmark' => null, 'postal_code' => null, 'is_default' => false])->save());

            // Messages they sent: the thread stays for the other person, the words and photos go.
            $privateFiles = [...$privateFiles, ...DB::table('conversation_messages')->where('sender_id', $user->id)->whereNotNull('image_path')->pluck('image_path')->all()];
            DB::table('conversation_messages')->where('sender_id', $user->id)
                ->update(['body' => 'Message removed: this account was deleted.', 'image_path' => null, 'updated_at' => now()]);

            DB::table('customer_notifications')->where('customer_id', $user->id)->delete();
            DB::table('user_profiles')->where('user_id', $user->id)->delete();
            DB::table(config('session.table'))->where('user_id', $user->id)->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->roles()->detach();

            if ($profile) {
                $privateFiles = [...$privateFiles, ...DB::table('provider_verification_documents')->where('provider_profile_id', $profile->id)->pluck('path')->all()];
                DB::table('provider_verification_documents')->where('provider_profile_id', $profile->id)->delete();
                $publicFiles = [...$publicFiles,
                    ...DB::table('provider_portfolio_items')->where('provider_profile_id', $profile->id)->pluck('image_path')->all(),
                    ...DB::table('provider_services')->where('provider_profile_id', $profile->id)->whereNotNull('cover_path')->pluck('cover_path')->all(),
                    ...array_filter([$profile->photo_path]),
                ];
                DB::table('provider_portfolio_items')->where('provider_profile_id', $profile->id)->delete();
                DB::table('provider_services')->where('provider_profile_id', $profile->id)->update(['active' => false, 'cover_path' => null, 'updated_at' => now()]);
                DB::table('provider_service_areas')->where('provider_profile_id', $profile->id)->update(['active' => false, 'updated_at' => now()]);
                DB::table('provider_notifications')->where('provider_profile_id', $profile->id)->delete();
                DB::table('provider_profiles')->where('id', $profile->id)->update([
                    'status' => 'deleted', 'display_name' => 'Deleted provider', 'bio' => '', 'photo_path' => null,
                    'accepting_requests' => false, 'updated_at' => now(),
                ]);
            }

            $user->forceFill([
                'name' => 'Deleted user',
                'email' => 'deleted-'.$user->id.'@deleted.ayos.invalid',
                'mobile_number' => '',
                'google_id' => null,
                // The model casts password as hashed, so this random value is stored as a hash nobody knows.
                'password' => Str::random(64),
                // Older address columns on the users table itself.
                'address_line' => null, 'barangay' => null, 'city' => null, 'province' => null,
                'postal_code' => null, 'latitude' => null, 'longitude' => null,
                'remember_token' => null,
                'two_factor_secret' => null,
                'two_factor_recovery_codes' => null,
                'two_factor_confirmed_at' => null,
                'is_admin' => false,
                'status' => 'deleted',
            ])->save();

            SecurityAudit::create(['user_id' => $user->id, 'event_type' => 'ACCOUNT_DELETED', 'metadata' => ['source' => 'self-service']]);
        });

        // Files go only after the database change is saved, so a failed deletion never leaves records pointing at missing files.
        Storage::disk('local')->delete(array_values(array_filter($privateFiles)));
        Storage::disk('public')->delete(array_values(array_filter($publicFiles)));
    }
}
