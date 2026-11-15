<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

/**
 * "Download my data" and self-service account deletion.
 */
class AccountDataTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private const ADDRESS_LINE = '26 Jesus Street';

    private const PASSWORD = 'a-long-passphrase-for-ayos';

    public function test_export_downloads_the_users_own_data_without_secrets(): void
    {
        $this->getJson('/api/account/export')->assertUnauthorized();
        $this->seedMarketplaceReferenceData();
        $providerId = $this->approvedProvider(User::factory()->create());
        $customer = User::factory()->create(['name' => 'Ana Santos', 'password' => self::PASSWORD]);
        $this->sendRequest($customer, $providerId);

        $response = $this->actingAs($customer)->getJson('/api/account/export')->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename="ayos-my-data-'.now()->format('Y-m-d').'.json"')
            ->assertJsonPath('account.name', 'Ana Santos')
            ->assertJsonPath('addresses.0.address_line', self::ADDRESS_LINE)
            ->assertJsonPath('addresses.0.barangay', 'Barangay IX')
            ->assertJsonPath('service_requests.0.service', 'Electrical')
            ->assertJsonPath('provider', null);

        $body = $response->getContent();
        $this->assertStringNotContainsString($customer->password, $body);
        $this->assertStringNotContainsString('two_factor_secret', $body);
        $this->assertDatabaseHas('security_audits', ['user_id' => $customer->id, 'event_type' => 'DATA_EXPORTED']);
    }

    public function test_deleting_anonymizes_the_account_and_keeps_the_providers_records(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create(['name' => 'Ana Santos', 'password' => self::PASSWORD]);
        $requestId = $this->sendRequest($customer, $providerId);
        $jobId = $this->completeJob($providerUser, $customer, $requestId);
        $this->actingAs($customer)->postJson("/api/customer/jobs/{$jobId}/review", ['rating' => 5, 'comment' => 'Great work.'])->assertCreated();
        $unusedLocation = $this->saveLocation($customer, 'Work', false);
        $messageId = $this->message($customer, $providerId, 'Call me at the gate.');
        DB::table('sessions')->insert(['id' => 'customer-session', 'user_id' => $customer->id, 'payload' => '', 'last_activity' => time()]);
        $email = $customer->email;

        $this->actingAs($customer)->deleteJson('/api/account', ['password' => 'wrong-password'])->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertSame('Ana Santos', $customer->fresh()->name);

        $this->actingAs($customer)->getJson('/api/account/deletion-check')->assertOk()->assertJsonPath('blockers', [])->assertJsonPath('confirmWith', 'password');
        $this->actingAs($customer)->deleteJson('/api/account', ['password' => self::PASSWORD])->assertOk();

        $deleted = $customer->fresh();
        $this->assertSame('Deleted user', $deleted->name);
        $this->assertSame('deleted', $deleted->status);
        $this->assertSame('', $deleted->mobile_number);
        $this->assertNotSame($email, $deleted->email);
        $this->assertFalse(Hash::check(self::PASSWORD, $deleted->password));
        $this->assertDatabaseMissing('users', ['email' => $email]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $customer->id]);
        $this->assertDatabaseMissing('service_locations', ['id' => $unusedLocation]);
        $this->assertSame('', DB::table('service_locations')->where('user_id', $customer->id)->get()->map(fn ($row) => decrypt($row->address_line, false))->first());
        $this->assertDatabaseHas('conversation_messages', ['id' => $messageId, 'body' => 'Message removed: this account was deleted.']);
        $this->assertDatabaseHas('security_audits', ['user_id' => $customer->id, 'event_type' => 'ACCOUNT_DELETED']);

        // The provider keeps the completed job and the review it earned.
        $this->assertDatabaseHas('provider_jobs', ['id' => $jobId, 'status' => 'completed']);
        $this->assertDatabaseHas('provider_reviews', ['provider_job_id' => $jobId, 'rating' => 5]);
    }

    public function test_an_unfinished_job_blocks_deletion(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create(['password' => self::PASSWORD]);
        $requestId = $this->sendRequest($customer, $providerId);
        $this->actingAs($providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk();

        $this->actingAs($customer)->deleteJson('/api/account', ['password' => self::PASSWORD])->assertStatus(409)
            ->assertJsonPath('blockers.0', 'You have a booked service that is not finished. Complete or cancel it in My requests first.');
        $this->assertSame('active', $customer->fresh()->status ?? 'active');
        $this->assertNotSame('Deleted user', $customer->fresh()->name);
    }

    public function test_a_provider_is_hidden_and_their_documents_and_waiting_requests_are_closed(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create(['password' => self::PASSWORD]);
        $providerId = $this->approvedProvider($providerUser);
        Storage::disk('local')->put('provider-verification/'.$providerId.'/id.pdf', 'id');
        DB::table('provider_verification_documents')->insert(['provider_profile_id' => $providerId, 'path' => 'provider-verification/'.$providerId.'/id.pdf',
            'original_name' => 'id.pdf', 'mime_type' => 'application/pdf', 'created_at' => now(), 'updated_at' => now()]);
        $customer = User::factory()->create();
        $requestId = $this->sendRequest($customer, $providerId);

        $this->actingAs($providerUser)->deleteJson('/api/account', ['password' => self::PASSWORD])->assertOk();

        $this->assertDatabaseHas('provider_profiles', ['id' => $providerId, 'status' => 'deleted', 'display_name' => 'Deleted provider', 'accepting_requests' => false]);
        $this->assertDatabaseMissing('provider_verification_documents', ['provider_profile_id' => $providerId]);
        Storage::disk('local')->assertMissing('provider-verification/'.$providerId.'/id.pdf');
        $this->assertDatabaseHas('service_requests', ['id' => $requestId, 'status' => 'declined']);
        $this->assertDatabaseHas('customer_notifications', ['customer_id' => $customer->id, 'title' => 'Request declined']);
        $this->actingAs($customer)->getJson('/api/providers?cityCode=0704622000')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_admins_must_lose_their_role_and_google_accounts_confirm_by_email(): void
    {
        $admin = User::factory()->create(['password' => self::PASSWORD]);
        $admin->roles()->attach(Role::query()->where('slug', 'super_admin')->value('id'), ['created_at' => now()]);
        $this->actingAs($admin)->deleteJson('/api/account', ['password' => self::PASSWORD])->assertStatus(409);
        $this->assertNotSame('Deleted user', $admin->fresh()->name);

        $google = User::factory()->create(['google_id' => 'google-123', 'email' => 'ana@example.test']);
        $this->actingAs($google)->getJson('/api/account/deletion-check')->assertJsonPath('confirmWith', 'email');
        $this->actingAs($google)->deleteJson('/api/account', ['email' => 'someone@example.test'])->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->actingAs($google)->deleteJson('/api/account', ['email' => 'ANA@example.test'])->assertOk();
        $this->assertNull($google->fresh()->google_id);
    }

    private function saveLocation(User $customer, string $label = 'Home', bool $default = true): int
    {
        return (int) $this->actingAs($customer)->postJson('/api/me/service-locations', [
            'label' => $label, 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009',
            'address_line' => self::ADDRESS_LINE, 'is_default' => $default,
        ])->assertCreated()->json('data.id');
    }

    private function sendRequest(User $customer, int $providerId): int
    {
        $locationId = $this->saveLocation($customer);

        return (int) $this->actingAs($customer)->postJson('/api/customer/requests', [
            'providerId' => $providerId, 'category' => 'electrical', 'serviceLocationId' => $locationId,
            'description' => 'Outlet in the kitchen sparks when used.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ])->assertCreated()->json('id');
    }

    private function completeJob(User $providerUser, User $customer, int $requestId): int
    {
        $jobId = (int) $this->actingAs($providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk()->json('jobs.0.id');
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/schedule", ['scheduledAt' => now()->addDays(2)->toIso8601String()])->assertOk();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/start")->assertOk();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/finish")->assertOk();
        $this->actingAs($customer)->postJson("/api/customer/jobs/{$jobId}/confirm")->assertOk();

        return $jobId;
    }

    private function message(User $customer, int $providerId, string $body): int
    {
        $conversationId = DB::table('conversations')->where('customer_id', $customer->id)->where('provider_profile_id', $providerId)->value('id')
            ?? DB::table('conversations')->insertGetId(['customer_id' => $customer->id, 'provider_profile_id' => $providerId,
                'last_message_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        return DB::table('conversation_messages')->insertGetId(['conversation_id' => $conversationId, 'sender_role' => 'customer',
            'sender_id' => $customer->id, 'body' => $body, 'masked' => false, 'created_at' => now(), 'updated_at' => now()]);
    }
}
