<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_workspace_requires_a_role_but_not_mfa(): void
    {
        $ordinaryUser = User::factory()->create();
        $this->actingAs($ordinaryUser)->getJson('/api/admin/dashboard')->assertForbidden();

        $admin = $this->admin('super_admin');
        $admin->forceFill(['two_factor_confirmed_at' => null])->save();
        $this->actingAs($admin)->getJson('/api/admin/access-check')->assertOk()
            ->assertJsonPath('access', 'allowed');
        $this->actingAs($admin)->getJson('/api/admin/dashboard')->assertOk();
    }

    public function test_bootstrap_command_creates_an_admin_without_exposing_the_password(): void
    {
        $password = 'Admin123';

        $this->artisan('ayos:bootstrap-admin')
            ->expectsQuestion('Admin email address', 'first.admin@example.test')
            ->expectsQuestion('Admin name', 'AYOS Administrator')
            ->expectsQuestion('Admin mobile number', '+639171234567')
            ->expectsQuestion('Admin password (minimum 8 characters)', $password)
            ->expectsQuestion('Confirm admin password', $password)
            ->expectsOutputToContain('Sign in at /login')
            ->assertExitCode(0);

        $admin = User::query()->where('email', 'first.admin@example.test')->firstOrFail();
        $this->assertTrue($admin->hasVerifiedEmail());
        $this->assertTrue($admin->hasAdminAccess());
        $this->assertTrue(password_verify($password, $admin->password));
        $this->assertDatabaseHas('security_audits', [
            'user_id' => $admin->id,
            'event_type' => 'ADMIN_BOOTSTRAPPED',
        ]);
    }

    public function test_bootstrap_command_rejects_passwords_shorter_than_eight_characters(): void
    {
        $this->artisan('ayos:bootstrap-admin')
            ->expectsQuestion('Admin email address', 'short.password@example.test')
            ->expectsQuestion('Admin name', 'AYOS Administrator')
            ->expectsQuestion('Admin mobile number', '+639171234568')
            ->expectsQuestion('Admin password (minimum 8 characters)', 'short7')
            ->expectsQuestion('Confirm admin password', 'short7')
            ->expectsOutputToContain('Use a password with at least 8 characters.')
            ->assertExitCode(1);

        $this->assertDatabaseMissing('users', ['email' => 'short.password@example.test']);
    }

    public function test_moderator_can_review_providers_but_cannot_change_platform_settings(): void
    {
        $moderator = $this->admin('moderator');
        $this->actingAs($moderator)->getJson('/api/admin/access-check')->assertOk()
            ->assertJsonFragment(['providers.review']);
        $this->actingAs($moderator)->getJson('/api/admin/provider-applications')->assertOk();
        $this->actingAs($moderator)->getJson('/api/admin/settings')->assertForbidden();
    }

    public function test_super_admin_can_update_quota_and_maintenance_keeps_admin_api_available(): void
    {
        $admin = $this->admin('super_admin');
        $this->actingAs($admin)->putJson('/api/admin/settings', [
            'free_successful_client_quota' => 12,
            'maintenance_mode' => true,
        ])->assertOk()->assertJsonPath('data.free_successful_client_quota', 12);

        $this->assertDatabaseHas('security_audits', ['user_id' => $admin->id, 'event_type' => 'QUOTA_CHANGED']);
        $this->getJson('/api/platform-state')->assertOk()->assertJsonPath('maintenance_mode', true);
        $this->getJson('/api/service-categories')->assertStatus(503);
        $this->getJson('/api/admin/dashboard')->assertOk();
    }

    private function admin(string $roleSlug): User
    {
        $user = User::factory()->create();
        $roleId = Role::query()->where('slug', $roleSlug)->value('id');
        $user->roles()->attach($roleId, ['created_at' => now()]);
        $user->forceFill([
            'is_admin' => true,
            'two_factor_secret' => encrypt(str_repeat('a', 32)),
            'two_factor_recovery_codes' => encrypt('[]'),
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $user;
    }
}
