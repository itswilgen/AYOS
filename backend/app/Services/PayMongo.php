<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * A thin client for PayMongo hosted checkout (https://docs.paymongo.com).
 * Amounts are in centavos (₱499 = 49900). Requests use the secret key as the HTTP basic auth username.
 */
class PayMongo
{
    public function configured(): bool
    {
        return filled(config('services.paymongo.secret_key'));
    }

    /**
     * Creates a hosted checkout session for one item and returns PayMongo's session id and checkout url.
     *
     * @param  array<string, string>  $metadata  string values only (a PayMongo rule)
     * @return array{id: string, checkout_url: string}
     */
    public function createCheckout(string $name, int $amountCentavos, string $reference, string $successUrl, string $cancelUrl, array $metadata = []): array
    {
        $response = $this->client()->post('/checkout_sessions', ['data' => ['attributes' => [
            'line_items' => [['name' => $name, 'amount' => $amountCentavos, 'currency' => 'PHP', 'quantity' => 1]],
            'payment_method_types' => $this->paymentMethods(),
            'description' => $name,
            'reference_number' => $reference,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'send_email_receipt' => true,
            'show_description' => true,
            'show_line_items' => true,
            'metadata' => $metadata,
        ]]]);
        $this->throwUnlessOk($response);
        $id = (string) $response->json('data.id');
        $url = (string) $response->json('data.attributes.checkout_url');
        if (! str_starts_with($id, 'cs_') || $url === '') {
            throw new RuntimeException('PayMongo did not return a checkout session.');
        }

        return ['id' => $id, 'checkout_url' => $url];
    }

    /**
     * The configured payment methods that this PayMongo account has enabled. A new account often has only `qrph`
     * (scannable with GCash, Maya or any bank app); asking for a method it lacks makes PayMongo refuse the checkout.
     * The account's list is remembered for an hour; if PayMongo cannot be asked, the configured list is used.
     *
     * @return list<string>
     */
    public function paymentMethods(): array
    {
        $configured = (array) config('services.paymongo.payment_methods', []);
        $enabled = Cache::remember('paymongo.payment_methods', 3600, function (): array {
            try {
                $methods = $this->client()->get('/merchants/capabilities/payment_methods')->throw()->json();

                return is_array($methods) ? array_values(array_filter($methods, 'is_string')) : [];
            } catch (Throwable) {
                return [];
            }
        });
        if ($enabled === []) {
            Cache::forget('paymongo.payment_methods');

            return array_values($configured);
        }
        $both = array_values(array_intersect($configured, $enabled));

        return $both !== [] ? $both : $enabled;
    }

    /**
     * @return array<string, mixed> the checkout session's `data` object
     */
    public function retrieveCheckout(string $sessionId): array
    {
        $response = $this->client()->get('/checkout_sessions/'.rawurlencode($sessionId));
        $this->throwUnlessOk($response);

        return (array) $response->json('data');
    }

    /**
     * The amount PayMongo actually collected for a checkout session, in centavos; 0 when it is not paid.
     *
     * @param  array<string, mixed>  $session  a checkout session `data` object (from the API or a webhook)
     */
    public static function paidAmount(array $session): int
    {
        foreach ((array) data_get($session, 'attributes.payments', []) as $payment) {
            if (data_get($payment, 'attributes.status') === 'paid') {
                return (int) data_get($payment, 'attributes.amount', 0);
            }
        }

        return 0;
    }

    /**
     * Verifies a `Paymongo-Signature` header: "t=<unix>,te=<test sig>,li=<live sig>", where each signature is
     * HMAC-SHA256 of "<t>.<raw body>" keyed with the webhook's secret. Live events are checked against `li`, test events against `te`.
     */
    public function validSignature(string $rawBody, ?string $header, bool $livemode): bool
    {
        $secret = (string) config('services.paymongo.webhook_secret');
        if ($secret === '' || ! $header) {
            return false;
        }
        $parts = [];
        foreach (explode(',', $header) as $piece) {
            [$key, $value] = array_pad(explode('=', trim($piece), 2), 2, '');
            $parts[$key] = $value;
        }
        $timestamp = $parts['t'] ?? '';
        $signature = $parts[$livemode ? 'li' : 'te'] ?? '';
        if (! ctype_digit($timestamp) || $signature === '') {
            return false;
        }
        if (abs(time() - (int) $timestamp) > (int) config('services.paymongo.signature_tolerance_seconds', 600)) {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $timestamp.'.'.$rawBody, $secret), $signature);
    }

    private function client(): PendingRequest
    {
        if (! $this->configured()) {
            throw new RuntimeException('PayMongo is not configured.');
        }

        return Http::baseUrl((string) config('services.paymongo.base_url'))
            ->withBasicAuth((string) config('services.paymongo.secret_key'), '')
            ->acceptJson()->asJson()->timeout(15);
    }

    private function throwUnlessOk(Response $response): void
    {
        try {
            $response->throw();
        } catch (RequestException $exception) {
            report($exception);
            throw new RuntimeException('PayMongo could not be reached. Please try again.', 0, $exception);
        }
    }
}
