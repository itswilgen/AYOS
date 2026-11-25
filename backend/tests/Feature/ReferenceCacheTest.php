<?php

namespace Tests\Feature;

use App\Services\PlatformSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

/**
 * Public reference data comes from the cache, and an admin change shows up straight away. Each test first
 * proves the cache is really used (a change made behind the app's back stays invisible), then proves the
 * admin's own change clears it.
 */
class ReferenceCacheTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    public function test_platform_settings_are_read_once_not_on_every_request_and_an_admin_change_applies_at_once(): void
    {
        $this->getJson('/api/platform-state')->assertOk()->assertJsonPath('maintenance_mode', false);

        DB::enableQueryLog();
        $this->getJson('/api/platform-state')->assertOk();
        $settingsReads = collect(DB::getQueryLog())->filter(fn (array $query) => str_contains($query['query'], 'system_settings'));
        $this->assertCount(0, $settingsReads, 'The second request should not read system_settings from the database.');

        app(PlatformSettings::class)->update(['maintenance_mode' => true], null);

        $this->getJson('/api/platform-state')->assertJsonPath('maintenance_mode', true);
        $this->getJson('/api/service-categories')->assertStatus(503);
    }

    public function test_service_categories_are_cached_and_a_new_admin_category_shows_at_once(): void
    {
        $this->seedMarketplaceReferenceData();
        $count = count($this->getJson('/api/service-categories')->assertOk()->json('data'));

        // Behind the app's back: the cached list doesn't change.
        DB::table('service_categories')->insert(['name' => 'Hidden', 'slug' => 'hidden', 'description' => '', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->assertCount($count, $this->getJson('/api/service-categories')->json('data'));

        $this->actingAs($this->admin())->postJson('/api/admin/categories', ['name' => 'Roofing', 'slug' => 'roofing', 'description' => 'Roof repairs'])->assertCreated();

        $names = collect($this->getJson('/api/service-categories')->json('data'))->pluck('name');
        $this->assertContains('Roofing', $names);
        $this->assertCount($count + 2, $names);
    }

    public function test_a_published_notice_shows_at_once(): void
    {
        $this->getJson('/api/platform-notices')->assertOk()->assertJsonCount(0, 'data');

        $this->actingAs($this->admin())->postJson('/api/admin/notices', ['title' => 'Maintenance tonight', 'body' => 'Offline from 11 PM.', 'is_active' => true])->assertOk();

        $this->getJson('/api/platform-notices')->assertJsonPath('data.0.title', 'Maintenance tonight');
    }

    public function test_turning_on_a_supported_location_changes_the_pickers_at_once(): void
    {
        $this->seedMarketplaceReferenceData();
        $this->getJson('/api/locations/regions/0700000000/cities-municipalities')->assertOk()->assertJsonCount(2, 'data');

        // Only Tanjay is served: the city picker must narrow to it right away.
        $this->actingAs($this->admin())->patchJson('/api/admin/locations/0704622000/status', ['is_active' => true])->assertOk();

        $this->getJson('/api/locations/regions/0700000000/cities-municipalities')
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Tanjay City');
    }

    public function test_location_answers_keep_their_shape(): void
    {
        $this->seedMarketplaceReferenceData();

        $this->getJson('/api/locations/regions')->assertOk()->assertExactJson(['data' => [['code' => '0700000000', 'name' => 'Region VII']]]);
        $this->getJson('/api/locations/regions/0700000000/cities-municipalities')
            ->assertJsonPath('data.0', ['code' => '0704610000', 'name' => 'Dumaguete City', 'type' => 'city']);
        $this->getJson('/api/locations/cities-municipalities/0704622000/barangays')->assertExactJson(['data' => [['code' => '0704622009', 'name' => 'Barangay IX']]]);
        $this->getJson('/api/locations/regions/9900000000/provinces')->assertNotFound();
    }
}
