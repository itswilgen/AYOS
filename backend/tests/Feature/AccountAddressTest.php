<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class AccountAddressTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedMarketplaceReferenceData();
    }

    public function test_setup_saves_the_home_address_as_the_default_service_location_and_accepts_terms(): void
    {
        $user = User::factory()->create(['terms_accepted_at' => null]);

        $this->actingAs($user)->getJson('/api/account/address')->assertOk()->assertJsonPath('data', null);
        $this->actingAs($user)->putJson('/api/account/address', [...$this->address(), 'terms_accepted' => true])->assertOk()
            ->assertJsonPath('data.label', 'Home')
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.barangay.name', 'Barangay IX');

        $this->assertTrue($user->fresh()->hasCompleteAddress());
        $this->assertNotNull($user->fresh()->terms_accepted_at);
        $this->actingAs($user)->getJson('/api/account/address')->assertOk()
            ->assertJsonPath('data.city_municipality.name', 'Tanjay City')
            ->assertJsonPath('data.address_line', '26 Jesus Street');
    }

    public function test_saving_again_updates_the_same_default_location(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->putJson('/api/account/address', $this->address())->assertOk();

        $this->actingAs($user)->putJson('/api/account/address', $this->address(['address_line' => '9 Rizal Avenue']))->assertOk();

        $this->assertDatabaseCount('service_locations', 1);
        $this->assertSame('9 Rizal Avenue', $user->defaultServiceLocation()->address_line);
    }

    public function test_a_default_location_used_by_a_request_is_kept_and_the_new_address_becomes_default(): void
    {
        $user = User::factory()->create();
        $original = $this->actingAs($user)->putJson('/api/account/address', $this->address())->assertOk()->json('data.id');
        $providerId = $this->approvedProvider(User::factory()->create());
        $this->actingAs($user)->postJson('/api/customer/requests', [
            'providerId' => $providerId, 'category' => 'electrical', 'serviceLocationId' => $original,
            'description' => 'Breaker trips every night.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ])->assertCreated();

        $this->actingAs($user)->putJson('/api/account/address', $this->address(['address_line' => '9 Rizal Avenue']))->assertOk();

        $this->assertDatabaseHas('service_locations', ['id' => $original, 'is_default' => false]);
        $this->assertSame('9 Rizal Avenue', $user->defaultServiceLocation()->address_line);
    }

    public function test_address_must_follow_the_selected_area_and_needs_a_verified_email(): void
    {
        $this->actingAs(User::factory()->unverified()->create())->getJson('/api/account/address')->assertForbidden();

        $this->actingAs(User::factory()->create())
            ->putJson('/api/account/address', $this->address(['city_municipality_code' => '0704610000']))
            ->assertUnprocessable()->assertJsonValidationErrors(['barangay_code']);
    }

    /**
     * @param  array<string, string>  $overrides
     * @return array<string, string>
     */
    private function address(array $overrides = []): array
    {
        return [
            'region_code' => '0700000000', 'province_code' => '0704600000', 'city_municipality_code' => '0704622000',
            'barangay_code' => '0704622009', 'address_line' => '26 Jesus Street', 'postal_code' => '6204', ...$overrides,
        ];
    }
}
