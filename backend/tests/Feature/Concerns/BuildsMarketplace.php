<?php

namespace Tests\Feature\Concerns;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\ServiceCategorySeeder;
use Illuminate\Support\Facades\DB;

/**
 * Shared marketplace fixtures: Tanjay and Dumaguete reference data, approved providers, and admins by role.
 */
trait BuildsMarketplace
{
    protected function seedMarketplaceReferenceData(): void
    {
        $this->seed(ServiceCategorySeeder::class);
        $now = now();
        DB::table('regions')->insert(['code' => '0700000000', 'name' => 'Region VII', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('provinces')->insert(['code' => '0704600000', 'region_code' => '0700000000', 'name' => 'Negros Oriental', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('city_municipalities')->insert([
            ['code' => '0704622000', 'region_code' => '0700000000', 'province_code' => '0704600000', 'name' => 'Tanjay City', 'type' => 'city', 'created_at' => $now, 'updated_at' => $now],
            ['code' => '0704610000', 'region_code' => '0700000000', 'province_code' => '0704600000', 'name' => 'Dumaguete City', 'type' => 'city', 'created_at' => $now, 'updated_at' => $now],
        ]);
        DB::table('barangays')->insert(['code' => '0704622009', 'city_municipality_code' => '0704622000', 'name' => 'Barangay IX', 'created_at' => $now, 'updated_at' => $now]);
    }

    protected function approvedProvider(User $user, string $displayName = 'Juan Electrical Works'): int
    {
        $this->actingAs($user)->postJson('/api/provider/apply', ['displayName' => $displayName, 'bio' => 'Licensed residential electrician.', 'yearsExperience' => 8])
            ->assertCreated()->assertJsonPath('applicationStatus', 'pending');
        $profileId = (int) DB::table('provider_profiles')->where('user_id', $user->id)->value('id');

        $this->actingAs($this->admin())->postJson("/api/admin/provider-applications/{$profileId}/decision", ['status' => 'approved'])->assertOk();
        $this->actingAs($user)->postJson('/api/provider/services', ['category' => 'Electrical', 'description' => 'Wiring and fixtures'])->assertOk();
        $this->actingAs($user)->postJson('/api/provider/areas', ['region' => 'Region VII', 'province' => 'Negros Oriental', 'city' => 'Tanjay City'])->assertOk();
        $this->actingAs($user)->patchJson('/api/provider/accepting', ['accepting' => true])->assertOk()->assertJsonPath('acceptingRequests', true);

        return $profileId;
    }

    protected function admin(string $roleSlug = 'super_admin'): User
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->roles()->attach(Role::query()->where('slug', $roleSlug)->value('id'), ['created_at' => now()]);

        return $admin;
    }
}
