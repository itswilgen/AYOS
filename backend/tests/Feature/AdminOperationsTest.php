<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
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

    public function test_administrator_creates_an_admin_account_that_can_open_the_console_and_returns_201(): void
    {
        $creator = $this->admin('admin');

        $this->actingAs($creator)->postJson('/api/admin/administrators', $this->newAdministrator([
            'email' => ' New.Moderator@Example.test ', 'mobile_number' => '+63 917 555 0101', 'role' => 'moderator',
        ]))->assertCreated()->assertJsonPath('data.email', 'new.moderator@example.test')->assertJsonPath('data.role', 'moderator');

        $administrator = User::query()->where('email', 'new.moderator@example.test')->firstOrFail();
        $this->assertSame('+639175550101', $administrator->mobile_number);
        $this->assertTrue($administrator->hasVerifiedEmail());
        $this->assertTrue(password_verify('Initial-admin-pass-2026!', $administrator->password));
        $this->assertDatabaseHas('user_roles', ['user_id' => $administrator->id, 'role_id' => Role::query()->where('slug', 'moderator')->value('id'), 'assigned_by' => $creator->id]);
        $this->assertDatabaseHas('security_audits', ['user_id' => $creator->id, 'event_type' => 'ADMIN_ACCOUNT_CREATED']);
        $this->actingAs($administrator)->getJson('/api/admin/access-check')->assertOk()->assertJsonPath('access', 'allowed');
    }

    public function test_super_admin_can_create_another_super_admin(): void
    {
        $this->actingAs($this->admin('super_admin'))->postJson('/api/admin/administrators', $this->newAdministrator(['role' => 'super_admin']))
            ->assertCreated()->assertJsonPath('data.role', 'super_admin');
    }

    public function test_administrator_cannot_create_a_super_admin_and_gets_422(): void
    {
        $this->actingAs($this->admin('admin'))->postJson('/api/admin/administrators', $this->newAdministrator(['role' => 'super_admin']))
            ->assertUnprocessable()->assertJsonValidationErrors(['role' => 'Choose a role you’re allowed to assign. Only a super admin can add another super admin.']);
        $this->assertDatabaseMissing('users', ['email' => 'new.admin@example.test']);
    }

    #[TestWith(['moderator'])]
    #[TestWith(['support'])]
    public function test_admin_without_the_manage_administrators_permission_gets_403(string $roleSlug): void
    {
        $this->actingAs($this->admin($roleSlug))->postJson('/api/admin/administrators', $this->newAdministrator())->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => 'new.admin@example.test']);
    }

    /**
     * @param  array<string, string>  $overrides
     */
    #[DataProvider('invalidAdministrators')]
    public function test_create_administrator_rejects_invalid_details_with_422(array $overrides, string $field, string $message): void
    {
        User::factory()->create(['email' => 'taken@example.test']);

        $this->actingAs($this->admin('super_admin'))->postJson('/api/admin/administrators', $this->newAdministrator($overrides))
            ->assertUnprocessable()->assertJsonValidationErrors([$field => $message]);
    }

    /**
     * @return array<string, array{array<string, string>, string, string}>
     */
    public static function invalidAdministrators(): array
    {
        return [
            'email already registered, in another case' => [['email' => 'Taken@Example.test'], 'email', 'An AYOS account already uses this email.'],
            'mobile number with letters' => [['mobile_number' => 'call me maybe'], 'mobile_number', 'Enter a valid mobile number, like +63 917 123 4567.'],
            'password without a symbol' => [['password' => 'initialadminpass2026', 'password_confirmation' => 'initialadminpass2026'], 'password', 'The password field must contain at least one symbol.'],
        ];
    }

    public function test_security_overview_offers_super_admin_only_to_super_admins(): void
    {
        $this->actingAs($this->admin('super_admin'))->getJson('/api/admin/security')->assertOk()
            ->assertJsonPath('data.assignableRoles.*.slug', ['super_admin', 'admin', 'moderator', 'support']);
        $this->actingAs($this->admin('admin'))->getJson('/api/admin/security')->assertOk()
            ->assertJsonPath('data.assignableRoles.*.slug', ['admin', 'moderator', 'support']);
    }

    /**
     * @param  array<string, string>  $overrides
     * @return array<string, string>
     */
    private function newAdministrator(array $overrides = []): array
    {
        return [
            'name' => 'New Admin', 'email' => 'new.admin@example.test', 'mobile_number' => '+639175550100', 'role' => 'admin',
            'password' => 'Initial-admin-pass-2026!', 'password_confirmation' => 'Initial-admin-pass-2026!', ...$overrides,
        ];
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
