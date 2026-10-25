<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PlatformSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class MarketplaceFlowTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private const ADDRESS_LINE = '26 Jesus Street';

    public function test_customer_and_provider_complete_the_full_service_lifecycle(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create(['email' => 'provider@example.test']);
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create();
        $locationId = $this->savedLocation($customer);

        $this->actingAs($customer)->getJson('/api/providers?category=electrical&cityCode=0704622000')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $providerId)
            ->assertJsonPath('data.0.specialties', ['Electrical'])
            ->assertDontSee('provider@example.test');
        $this->actingAs($customer)->getJson('/api/providers?category=electrical&cityCode=0704610000')->assertOk()->assertJsonCount(0, 'data');

        $requestId = $this->requestService($customer, $providerId, $locationId);

        $this->assertDatabaseHas('service_requests', ['id' => $requestId, 'customer_id' => $customer->id, 'status' => 'new']);
        $this->actingAs($providerUser)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('requests.0.id', (string) $requestId)
            ->assertJsonPath('requests.0.approximateLocation', 'Tanjay City, Negros Oriental')
            ->assertDontSee(self::ADDRESS_LINE);

        $jobId = (int) $this->actingAs($providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk()
            ->assertJsonPath('requests.0.status', 'accepted')
            ->assertJsonPath('jobs.0.status', 'accepted')
            ->json('jobs.0.id');

        $this->assertStringContainsString(self::ADDRESS_LINE, $this->actingAs($providerUser)->getJson('/api/provider/workspace')->json('jobs.0.address'));
        $this->actingAs($customer)->postJson("/api/customer/jobs/{$jobId}/confirm")->assertConflict();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/start")->assertConflict();

        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/schedule", ['scheduledAt' => now()->addDays(2)->toIso8601String()])
            ->assertOk()->assertJsonPath('jobs.0.status', 'scheduled');
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/start")->assertOk()->assertJsonPath('jobs.0.status', 'in_progress');
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/finish")->assertOk()->assertJsonPath('jobs.0.status', 'provider_finished');
        $this->actingAs($customer)->postJson("/api/customer/jobs/{$jobId}/confirm")->assertOk()->assertJsonPath('status', 'completed');
        $this->actingAs($customer)->postJson("/api/customer/jobs/{$jobId}/review", ['rating' => 5, 'comment' => 'Fixed the wiring quickly.'])->assertCreated();

        $this->assertDatabaseHas('provider_jobs', ['id' => $jobId, 'status' => 'completed']);
        $this->assertDatabaseHas('provider_reviews', ['provider_job_id' => $jobId, 'customer_id' => $customer->id, 'rating' => 5]);
        $this->actingAs($customer)->postJson("/api/customer/jobs/{$jobId}/review", ['rating' => 4])->assertConflict();
        $this->assertDatabaseCount('provider_reviews', 1);
        $this->actingAs($customer)->getJson('/api/customer/requests')->assertOk()
            ->assertJsonPath('data.0.job_status', 'completed')
            ->assertJsonPath('data.0.provider_name', 'Juan Electrical Works');
        $this->assertSame(
            ['Work finished', 'Work started', 'Visit scheduled', 'Request accepted'],
            collect($this->actingAs($customer)->getJson('/api/customer/notifications')->json('data'))->pluck('title')->all(),
        );
        $this->actingAs($providerUser)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('reviews.0.rating', 5)
            ->assertJsonPath('access.successfulClients', 1);
        $this->actingAs($customer)->getJson('/api/providers?category=electrical')->assertOk()
            ->assertJsonPath('data.0.reviewCount', 1)
            ->assertJsonPath('data.0.completedServices', 1);
    }

    public function test_marketplace_records_return_404_to_users_who_do_not_own_them(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $otherProviderUser = User::factory()->create();
        $this->approvedProvider($otherProviderUser, 'Other Electrical');
        $customer = User::factory()->create();
        $otherCustomer = User::factory()->create();
        $locationId = $this->savedLocation($customer);

        $this->actingAs($otherCustomer)->postJson('/api/customer/requests', $this->requestPayload($providerId, $locationId))->assertNotFound();
        $this->actingAs($providerUser)->postJson('/api/customer/requests', $this->requestPayload($providerId, $this->savedLocation($providerUser)))->assertNotFound();
        $this->assertDatabaseCount('service_requests', 0);

        $requestId = $this->requestService($customer, $providerId, $locationId);
        $this->actingAs($otherProviderUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertNotFound();
        $this->actingAs($otherProviderUser)->getJson('/api/provider/workspace')->assertOk()->assertJsonCount(0, 'requests');
        $this->assertDatabaseHas('service_requests', ['id' => $requestId, 'status' => 'new']);

        $jobId = (int) $this->actingAs($providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk()->json('jobs.0.id');
        $this->actingAs($otherProviderUser)->postJson("/api/provider/jobs/{$jobId}/schedule", ['scheduledAt' => now()->addDay()->toIso8601String()])->assertNotFound();
        $this->actingAs($otherCustomer)->postJson("/api/customer/jobs/{$jobId}/cancel")->assertNotFound();
        $this->actingAs($otherCustomer)->getJson('/api/customer/requests')->assertOk()->assertJsonCount(0, 'data');
        $this->assertDatabaseHas('provider_jobs', ['id' => $jobId, 'status' => 'accepted']);
    }

    public function test_unapproved_paused_or_unverified_parties_cannot_create_requests(): void
    {
        $this->seedMarketplaceReferenceData();
        $customer = User::factory()->create();
        $locationId = $this->savedLocation($customer);
        $pendingUser = User::factory()->create();
        $pendingId = (int) DB::table('provider_profiles')->insertGetId(['user_id' => $pendingUser->id, 'display_name' => 'Pending Pro', 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $unverified = User::factory()->unverified()->create();

        $this->actingAs($pendingUser)->postJson('/api/provider/services', ['category' => 'Electrical'])->assertForbidden();
        $this->actingAs($customer)->postJson('/api/customer/requests', $this->requestPayload($pendingId, $locationId))->assertConflict();
        $this->actingAs($providerUser)->patchJson('/api/provider/accepting', ['accepting' => false])->assertOk();
        $this->actingAs($customer)->getJson('/api/providers?category=electrical')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($customer)->postJson('/api/customer/requests', $this->requestPayload($providerId, $locationId))->assertConflict();
        $this->actingAs($unverified)->postJson('/api/customer/requests', $this->requestPayload($providerId, $locationId))->assertForbidden();

        $this->assertDatabaseCount('service_requests', 0);
    }

    public function test_reaching_the_free_client_quota_pauses_new_requests_until_lifetime_access(): void
    {
        $this->seedMarketplaceReferenceData();
        app(PlatformSettings::class)->update(['free_successful_client_quota' => 1], null);
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $firstCustomer = User::factory()->create();
        $secondCustomer = User::factory()->create();
        $secondLocationId = $this->savedLocation($secondCustomer);
        $firstRequestId = $this->requestService($firstCustomer, $providerId, $this->savedLocation($firstCustomer));
        $jobId = (int) $this->actingAs($providerUser)->postJson("/api/provider/requests/{$firstRequestId}/accept")->json('jobs.0.id');
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/schedule", ['scheduledAt' => now()->addDay()->toIso8601String()])->assertOk();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/start")->assertOk();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/finish")->assertOk();

        $this->actingAs($firstCustomer)->postJson("/api/customer/jobs/{$jobId}/confirm")->assertOk();

        $this->assertDatabaseHas('provider_profiles', ['id' => $providerId, 'accepting_requests' => false]);
        $this->actingAs($providerUser)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('notifications.0.title', 'Free client quota complete');
        $this->actingAs($providerUser)->patchJson('/api/provider/accepting', ['accepting' => true])->assertConflict();
        $this->actingAs($secondCustomer)->getJson('/api/providers?category=electrical')->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($secondCustomer)->postJson('/api/customer/requests', $this->requestPayload($providerId, $secondLocationId))->assertConflict();

        DB::table('provider_profiles')->where('id', $providerId)->update(['access_kind' => 'lifetime']);
        $this->actingAs($providerUser)->patchJson('/api/provider/accepting', ['accepting' => true])->assertOk();
        $this->requestService($secondCustomer, $providerId, $secondLocationId);
    }

    private function savedLocation(User $customer): int
    {
        return (int) $this->actingAs($customer)->postJson('/api/me/service-locations', [
            'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009',
            'address_line' => self::ADDRESS_LINE, 'is_default' => true,
        ])->assertCreated()->json('data.id');
    }

    /** @return array{providerId: int, category: string, serviceLocationId: int, description: string, preferredAt: string} */
    private function requestPayload(int $providerId, int $locationId): array
    {
        return [
            'providerId' => $providerId, 'category' => 'electrical', 'serviceLocationId' => $locationId,
            'description' => 'Outlet in the kitchen sparks when used.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ];
    }

    private function requestService(User $customer, int $providerId, int $locationId): int
    {
        return (int) $this->actingAs($customer)->postJson('/api/customer/requests', $this->requestPayload($providerId, $locationId))
            ->assertCreated()->json('id');
    }
}
