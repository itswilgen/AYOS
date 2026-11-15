<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

/**
 * The customer Home page's "Meet local pros" row: providers who serve the customer's city, best-proven first.
 */
class ProviderDiscoveryTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private const TANJAY = '0704622000';

    public function test_area_label_names_the_customers_city_when_a_provider_serves_several(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser, 'Ana Electrical');
        // Dumaguete sorts before Tanjay, so an unfiltered label would name the wrong city.
        $this->actingAs($providerUser)->postJson('/api/provider/areas', ['region' => 'Region VII', 'province' => 'Negros Oriental', 'city' => 'Dumaguete City'])->assertOk();

        $this->actingAs(User::factory()->create())->getJson('/api/providers?cityCode='.self::TANJAY)->assertOk()
            ->assertJsonPath('data.0.id', (string) $providerId)
            ->assertJsonPath('data.0.serviceAreaLabel', 'Tanjay City');
    }

    public function test_providers_with_confirmed_work_are_listed_first(): void
    {
        $this->seedMarketplaceReferenceData();
        $newcomerId = $this->approvedProvider(User::factory()->create(), 'Ana Electrical');
        $provenId = $this->approvedProvider(User::factory()->create(), 'Ben Wiring');
        $this->completedJob($provenId, rating: 5);

        $this->actingAs(User::factory()->create())->getJson('/api/providers?cityCode='.self::TANJAY)->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', (string) $provenId)
            ->assertJsonPath('data.0.completedServices', 1)
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('data.1.id', (string) $newcomerId)
            ->assertJsonPath('data.1.rating', null);
    }

    private function completedJob(int $providerId, int $rating): void
    {
        $customer = User::factory()->create();
        $now = now();
        $locationId = DB::table('service_locations')->insertGetId([
            'user_id' => $customer->id, 'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => self::TANJAY, 'barangay_code' => '0704622009', 'address_line' => 'encrypted-in-app',
            'is_default' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);
        $requestId = DB::table('service_requests')->insertGetId([
            'customer_id' => $customer->id, 'provider_profile_id' => $providerId,
            'service_category_id' => DB::table('service_categories')->where('slug', 'electrical')->value('id'),
            'service_location_id' => $locationId, 'description' => 'Replace a broken outlet', 'preferred_at' => $now,
            'status' => 'accepted', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $jobId = DB::table('provider_jobs')->insertGetId([
            'service_request_id' => $requestId, 'provider_profile_id' => $providerId, 'customer_id' => $customer->id,
            'status' => 'completed', 'completed_at' => $now, 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('provider_reviews')->insert([
            'provider_job_id' => $jobId, 'provider_profile_id' => $providerId, 'customer_id' => $customer->id,
            'rating' => $rating, 'created_at' => $now, 'updated_at' => $now,
        ]);
    }
}
