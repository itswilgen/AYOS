<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class PriceGuideTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    public function test_provider_sets_a_starting_price_that_customers_see_on_the_profile_and_in_search(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $serviceId = (int) DB::table('provider_services')->where('provider_profile_id', $providerId)->value('id');

        $this->actingAs($providerUser)->putJson("/api/provider/services/{$serviceId}", ['category' => 'Electrical', 'description' => 'Wiring and fixtures', 'startingPrice' => 500])
            ->assertOk()->assertJsonPath('services.0.startingPrice', 500);

        $this->getJson("/api/providers/{$providerId}")->assertOk()->assertJsonPath('data.services.0.startingPrice', 500);
        $this->actingAs(User::factory()->create())->getJson('/api/providers?category=electrical&cityCode=0704622000')->assertOk()
            ->assertJsonPath('data.0.startingPrices.Electrical', 500);

        // Clearing it means "depends on the job": no price is shown anywhere.
        $this->actingAs($providerUser)->putJson("/api/provider/services/{$serviceId}", ['category' => 'Electrical', 'description' => 'Wiring and fixtures', 'startingPrice' => null])
            ->assertOk()->assertJsonPath('services.0.startingPrice', null);
        $this->actingAs(User::factory()->create())->getJson('/api/providers?category=electrical')->assertOk()
            ->assertJsonPath('data.0.startingPrices', []);
    }

    public function test_a_new_service_can_have_a_price_and_unrealistic_prices_are_refused(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $this->approvedProvider($providerUser);

        foreach ([10, 600000, 'abc', 99.5] as $bad) {
            $this->actingAs($providerUser)->postJson('/api/provider/services', ['category' => 'Solar', 'startingPrice' => $bad])
                ->assertUnprocessable()->assertJsonValidationErrors('startingPrice');
        }
        $this->actingAs($providerUser)->postJson('/api/provider/services', ['category' => 'Solar', 'startingPrice' => 1500])->assertOk();
        $this->assertDatabaseHas('provider_services', ['starting_price' => 1500]);
    }
}
