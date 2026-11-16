<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class SavedProvidersTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    public function test_customer_saves_a_provider_sees_it_everywhere_and_removes_it(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create();

        // Saving twice is safe: still one row.
        $this->actingAs($customer)->putJson("/api/customer/saved-providers/{$providerId}")->assertOk()->assertJsonPath('saved', true);
        $this->actingAs($customer)->putJson("/api/customer/saved-providers/{$providerId}")->assertOk();
        $this->assertDatabaseCount('saved_providers', 1);

        $this->actingAs($customer)->getJson("/api/providers/{$providerId}")->assertOk()->assertJsonPath('data.isSaved', true);
        $this->actingAs($customer)->getJson('/api/providers?category=electrical')->assertOk()->assertJsonPath('data.0.saved', true);
        $this->actingAs($customer)->getJson('/api/customer/saved-providers')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', (string) $providerId)
            ->assertJsonPath('data.0.specialties', ['Electrical'])
            ->assertJsonPath('data.0.acceptingRequests', true);

        // Another customer's view is their own.
        $this->actingAs(User::factory()->create())->getJson("/api/providers/{$providerId}")->assertOk()->assertJsonPath('data.isSaved', false);

        $this->actingAs($customer)->deleteJson("/api/customer/saved-providers/{$providerId}")->assertOk()->assertJsonPath('saved', false);
        $this->actingAs($customer)->deleteJson("/api/customer/saved-providers/{$providerId}")->assertOk();
        $this->actingAs($customer)->getJson('/api/customer/saved-providers')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_a_paused_provider_stays_listed_and_a_suspended_one_is_hidden(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create();
        $this->actingAs($customer)->putJson("/api/customer/saved-providers/{$providerId}")->assertOk();

        $this->actingAs($providerUser)->patchJson('/api/provider/accepting', ['accepting' => false])->assertOk();
        $this->actingAs($customer)->getJson('/api/customer/saved-providers')->assertOk()->assertJsonPath('data.0.acceptingRequests', false);

        DB::table('provider_profiles')->where('id', $providerId)->update(['status' => 'suspended']);
        $this->actingAs($customer)->getJson('/api/customer/saved-providers')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_saving_is_refused_for_your_own_profile_unknown_providers_and_guests(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);

        $this->actingAs($providerUser)->putJson("/api/customer/saved-providers/{$providerId}")->assertUnprocessable();
        $this->actingAs(User::factory()->create())->putJson('/api/customer/saved-providers/999999')->assertNotFound();
        $this->app['auth']->forgetGuards();
        $this->putJson("/api/customer/saved-providers/{$providerId}")->assertUnauthorized();
        $this->assertDatabaseCount('saved_providers', 0);
    }
}
