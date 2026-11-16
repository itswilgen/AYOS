<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ServiceUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

/**
 * The provider activation fee: PayMongo hosted checkout, the signed webhook, the return check, and manual review.
 * PayMongo is faked; no real request leaves the test.
 */
class ActivationPaymentTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private const WEBHOOK_SECRET = 'whsk_test_secret';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.paymongo.secret_key' => 'sk_test_ayos', 'services.paymongo.webhook_secret' => self::WEBHOOK_SECRET,
            'services.paymongo.payment_methods' => ['gcash', 'paymaya', 'card'], 'app.frontend_url' => 'http://localhost:5180']);
        Notification::fake();
        $this->seedMarketplaceReferenceData();
    }

    public function test_the_pilot_defaults_are_499_pesos_after_20_free_clients(): void
    {
        $provider = User::factory()->create();
        $this->approvedProvider($provider);

        $this->actingAs($provider)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('access.limit', 20)
            ->assertJsonPath('access.activationFee', 499)
            ->assertJsonPath('access.onlinePaymentsEnabled', true);
    }

    public function test_paying_online_grants_lifetime_access_once_through_the_signed_webhook(): void
    {
        $admin = $this->admin();
        $provider = User::factory()->create();
        $profileId = $this->approvedProvider($provider);
        $this->fakeCreate('cs_test_one');

        $url = $this->actingAs($provider)->postJson('/api/provider/activation-checkout')->assertOk()->json('checkoutUrl');
        $this->assertSame('https://checkout.paymongo.com/cs_test_one', $url);
        Http::assertSent(fn (HttpRequest $request) => $request->url() === 'https://api.paymongo.com/v1/checkout_sessions'
            && $request->hasHeader('Authorization', 'Basic '.base64_encode('sk_test_ayos:'))
            && $request['data']['attributes']['line_items'][0]['amount'] === 49900
            && $request['data']['attributes']['payment_method_types'] === ['gcash']
            && $request['data']['attributes']['success_url'] === 'http://localhost:5180/provider/access?payment=success');
        $this->assertDatabaseHas('activation_payments', ['provider_profile_id' => $profileId, 'method' => 'paymongo', 'status' => 'pending',
            'amount' => 499, 'transaction_id' => 'cs_test_one']);

        // Clicking again resumes the same checkout instead of opening a second one.
        $this->actingAs($provider)->postJson('/api/provider/activation-checkout')->assertOk()->assertJsonPath('checkoutUrl', $url);
        Http::assertSentCount(2); // the account's methods once, then one checkout

        $event = $this->paidEvent('cs_test_one', 49900);
        $this->postWebhook($event, 'not-a-valid-signature')->assertStatus(400);
        $this->assertDatabaseHas('provider_profiles', ['id' => $profileId, 'access_kind' => 'trial']);

        $this->postWebhook($event)->assertOk();
        $this->assertDatabaseHas('provider_profiles', ['id' => $profileId, 'access_kind' => 'lifetime']);
        $this->assertDatabaseHas('activation_payments', ['transaction_id' => 'cs_test_one', 'status' => 'confirmed']);
        $this->assertDatabaseHas('provider_notifications', ['provider_profile_id' => $profileId, 'title' => 'Lifetime access active']);
        Notification::assertSentToTimes($admin, ServiceUpdate::class, 1);

        // PayMongo retries: a second delivery changes nothing and sends no second email.
        $this->postWebhook($event)->assertOk();
        $this->assertSame(1, DB::table('provider_notifications')->where('provider_profile_id', $profileId)->where('title', 'Lifetime access active')->count());
        Notification::assertSentToTimes($admin, ServiceUpdate::class, 1);
        $this->actingAs($provider)->postJson('/api/provider/activation-checkout')->assertStatus(409);
    }

    public function test_returning_from_paymongo_confirms_the_payment_when_the_webhook_has_not_arrived(): void
    {
        $provider = User::factory()->create();
        $profileId = $this->approvedProvider($provider);
        Http::fake([
            'api.paymongo.com/v1/merchants/capabilities/payment_methods' => Http::response(['qrph']),
            'api.paymongo.com/v1/checkout_sessions/cs_test_two' => Http::response(['data' => $this->checkoutSession('cs_test_two', 49900)]),
            'api.paymongo.com/v1/checkout_sessions' => Http::response(['data' => ['id' => 'cs_test_two', 'attributes' => ['checkout_url' => 'https://checkout.paymongo.com/cs_test_two']]]),
        ]);
        $this->actingAs($provider)->postJson('/api/provider/activation-checkout')->assertOk();

        $this->actingAs($provider)->postJson('/api/provider/activation-checkout/sync')->assertOk()
            ->assertJsonPath('paymentStatus', 'confirmed')->assertJsonPath('accessKind', 'lifetime');
        $this->assertDatabaseHas('provider_profiles', ['id' => $profileId, 'access_kind' => 'lifetime']);
    }

    public function test_an_underpaid_or_unknown_checkout_never_grants_access(): void
    {
        $provider = User::factory()->create();
        $profileId = $this->approvedProvider($provider);
        $this->fakeCreate('cs_test_three');
        $this->actingAs($provider)->postJson('/api/provider/activation-checkout')->assertOk();

        $this->postWebhook($this->paidEvent('cs_test_three', 100))->assertOk();
        $this->postWebhook($this->paidEvent('cs_someone_else', 49900))->assertOk();

        $this->assertDatabaseHas('provider_profiles', ['id' => $profileId, 'access_kind' => 'trial']);
        $this->assertDatabaseHas('activation_payments', ['transaction_id' => 'cs_test_three', 'status' => 'pending']);
    }

    public function test_a_manual_reference_emails_admins_and_a_rejection_shows_the_reason(): void
    {
        $admin = $this->admin();
        $provider = User::factory()->create();
        $profileId = $this->approvedProvider($provider);
        $this->actingAs($admin)->putJson('/api/admin/settings', ['activation_payments_enabled' => true,
            'activation_payment_instructions' => 'Send ₱499 to the AYOS GCash account, then enter the reference number.'])->assertOk();

        $this->actingAs($provider)->postJson('/api/provider/activation-payments', ['reference' => '1234567890123'])->assertCreated();
        Notification::assertSentToTimes($admin, ServiceUpdate::class, 1);
        $paymentId = (int) DB::table('activation_payments')->where('reference', '1234567890123')->value('id');

        $this->actingAs($admin)->postJson("/api/admin/activation-payments/{$paymentId}/review", ['status' => 'rejected'])
            ->assertUnprocessable()->assertJsonValidationErrors('admin_note');
        $this->actingAs($admin)->postJson("/api/admin/activation-payments/{$paymentId}/review", ['status' => 'rejected', 'admin_note' => 'Reference not found in GCash.'])
            ->assertOk()->assertJsonPath('status', 'rejected');

        $this->actingAs($provider)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('access.paymentStatus', 'rejected')
            ->assertJsonPath('access.paymentNote', 'Reference not found in GCash.');
        $this->assertDatabaseHas('provider_notifications', ['provider_profile_id' => $profileId, 'title' => 'Activation payment not confirmed']);

        // After a rejection the provider can send a corrected reference, and an admin can confirm it.
        $this->actingAs($provider)->postJson('/api/provider/activation-payments', ['reference' => '9876543210987'])->assertCreated();
        $secondId = (int) DB::table('activation_payments')->where('reference', '9876543210987')->value('id');
        $this->actingAs($admin)->postJson("/api/admin/activation-payments/{$secondId}/review", ['status' => 'confirmed'])->assertOk();
        $this->assertDatabaseHas('provider_profiles', ['id' => $profileId, 'access_kind' => 'lifetime']);
        $this->actingAs($admin)->postJson("/api/admin/activation-payments/{$secondId}/review", ['status' => 'confirmed'])->assertStatus(409);
    }

    public function test_online_payment_is_off_until_paymongo_keys_are_set(): void
    {
        config(['services.paymongo.secret_key' => null]);
        $provider = User::factory()->create();
        $this->approvedProvider($provider);

        $this->actingAs($provider)->getJson('/api/provider/workspace')->assertJsonPath('access.onlinePaymentsEnabled', false);
        $this->actingAs($provider)->postJson('/api/provider/activation-checkout')->assertStatus(503);
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/provider/activation-checkout')->assertUnauthorized();
    }

    private function fakeCreate(string $sessionId): void
    {
        Http::fake(['api.paymongo.com/v1/merchants/capabilities/payment_methods' => Http::response(['qrph', 'gcash']),
            'api.paymongo.com/v1/checkout_sessions' => Http::response(['data' => ['id' => $sessionId, 'type' => 'checkout_session',
                'attributes' => ['checkout_url' => "https://checkout.paymongo.com/{$sessionId}", 'livemode' => false]]])]);
    }

    /**
     * @return array<string, mixed>
     */
    private function checkoutSession(string $id, int $paidCentavos): array
    {
        return ['id' => $id, 'type' => 'checkout_session', 'attributes' => ['livemode' => false, 'status' => 'active',
            'payments' => [['id' => 'pay_test', 'type' => 'payment', 'attributes' => ['amount' => $paidCentavos, 'currency' => 'PHP', 'status' => 'paid']]]]];
    }

    /**
     * @return array<string, mixed>
     */
    private function paidEvent(string $sessionId, int $paidCentavos): array
    {
        return ['data' => ['id' => 'evt_test', 'type' => 'event', 'attributes' => ['type' => 'checkout_session.payment.paid', 'livemode' => false,
            'data' => $this->checkoutSession($sessionId, $paidCentavos)]]];
    }

    /**
     * @param  array<string, mixed>  $event
     */
    private function postWebhook(array $event, ?string $signature = null): TestResponse
    {
        $body = json_encode($event, JSON_THROW_ON_ERROR);
        $timestamp = (string) time();
        $signature ??= hash_hmac('sha256', $timestamp.'.'.$body, self::WEBHOOK_SECRET);

        return $this->call('POST', '/api/webhooks/paymongo', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => "t={$timestamp},te={$signature},li=",
        ], $body);
    }
}
