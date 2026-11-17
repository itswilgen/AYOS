<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class SearchCoversTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    public function test_search_shows_only_the_approved_cover_of_the_service_that_matched(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $this->actingAs($providerUser)->postJson('/api/provider/services', ['category' => 'Solar'])->assertOk();
        $service = fn (string $name) => DB::table('provider_services as s')->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->where('s.provider_profile_id', $providerId)->where('c.name', $name)->value('s.id');
        DB::table('provider_services')->where('id', $service('Solar'))->update(['cover_path' => 'providers/1/services/solar.webp',
            'cover_status' => 'approved', 'cover_fit' => 'cover', 'cover_focus_x' => 40, 'cover_focus_y' => 60]);
        DB::table('provider_services')->where('id', $service('Electrical'))->update(['cover_path' => 'providers/1/services/wiring.webp',
            'cover_status' => 'pending', 'cover_fit' => 'cover', 'cover_focus_x' => 50, 'cover_focus_y' => 50]);
        $customer = User::factory()->create();

        $this->actingAs($customer)->getJson('/api/providers?category=solar')->assertOk()
            ->assertJsonPath('data.0.matchedService', 'Solar')
            ->assertJsonPath('data.0.cover.service', 'Solar')
            ->assertJsonPath('data.0.cover.focusX', 40)
            ->assertJsonPath('data.0.cover.focusY', 60);
        $this->assertStringEndsWith('/storage/providers/1/services/solar.webp',
            $this->actingAs($customer)->getJson('/api/providers?category=solar')->json('data.0.cover.image'));

        // The electrical cover still waits for review, and the solar photo must not stand in for it.
        $this->actingAs($customer)->getJson('/api/providers?category=electrical')->assertOk()
            ->assertJsonPath('data.0.matchedService', 'Electrical')->assertJsonPath('data.0.cover', null);
        $this->actingAs($customer)->getJson('/api/providers?q=elec')->assertOk()
            ->assertJsonPath('data.0.matchedService', 'Electrical')->assertJsonPath('data.0.cover', null);

        // Searching the provider's name matches no service, so the first approved cover is shown.
        $this->actingAs($customer)->getJson('/api/providers?q=juan')->assertOk()
            ->assertJsonPath('data.0.matchedService', null)->assertJsonPath('data.0.cover.service', 'Solar');

        // A rejected cover never reaches customers.
        DB::table('provider_services')->where('id', $service('Solar'))->update(['cover_status' => 'rejected']);
        $this->actingAs($customer)->getJson('/api/providers?category=solar')->assertOk()->assertJsonPath('data.0.cover', null);
    }
}
