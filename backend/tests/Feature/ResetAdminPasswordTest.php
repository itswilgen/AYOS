<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\AdminPasswordChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class ResetAdminPasswordTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private const NEW_PASSWORD = 'Fresh-Admin-Pass-2026';

    private const ASK_PASSWORD = 'New password (at least 12 characters, including a symbol)';

    private const ASK_CONFIRM = 'Confirm new password';

    public function test_admin_password_is_reset_privately_and_every_session_is_signed_out(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $oldHash = $admin->password;
        DB::table('sessions')->insert(['id' => 'old-session', 'user_id' => $admin->id, 'payload' => '', 'last_activity' => time()]);

        $this->artisan('ayos:reset-admin-password', ['email' => strtoupper($admin->email)])
            ->expectsQuestion(self::ASK_PASSWORD, self::NEW_PASSWORD)
            ->expectsQuestion(self::ASK_CONFIRM, self::NEW_PASSWORD)
            ->expectsConfirmation("Reset the password for {$admin->email} and sign this account out on every device?", 'yes')
            ->doesntExpectOutputToContain(self::NEW_PASSWORD)
            ->assertSuccessful();

        $admin->refresh();
        $this->assertTrue(Hash::check(self::NEW_PASSWORD, $admin->password));
        $this->assertNotSame($oldHash, $admin->password);
        $this->assertDatabaseMissing('sessions', ['user_id' => $admin->id]);
        $this->assertDatabaseHas('security_audits', ['user_id' => $admin->id, 'event_type' => 'ADMIN_PASSWORD_RESET']);
        Notification::assertSentTo($admin, AdminPasswordChanged::class);
    }

    public function test_weak_or_mismatched_passwords_change_nothing(): void
    {
        $admin = $this->admin();
        $oldHash = $admin->password;

        $this->artisan('ayos:reset-admin-password', ['email' => $admin->email])
            ->expectsQuestion(self::ASK_PASSWORD, 'short')
            ->expectsQuestion(self::ASK_CONFIRM, 'short')
            ->expectsOutputToContain('Nothing was changed.')
            ->assertFailed();

        $this->artisan('ayos:reset-admin-password', ['email' => $admin->email])
            ->expectsQuestion(self::ASK_PASSWORD, self::NEW_PASSWORD)
            ->expectsQuestion(self::ASK_CONFIRM, 'Different-Admin-Pass-2026')
            ->assertFailed();

        $this->assertSame($oldHash, $admin->refresh()->password);
        $this->assertDatabaseMissing('security_audits', ['event_type' => 'ADMIN_PASSWORD_RESET']);
    }

    public function test_only_existing_administrators_can_be_reset(): void
    {
        $customer = User::factory()->create();

        $this->artisan('ayos:reset-admin-password', ['email' => $customer->email])
            ->expectsOutputToContain('is not an administrator')
            ->assertFailed();

        $this->artisan('ayos:reset-admin-password', ['email' => 'nobody@example.test'])
            ->expectsOutputToContain('No AYOS account uses nobody@example.test')
            ->assertFailed();
    }
}
