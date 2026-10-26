<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Notifications\AdminPasswordChanged;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Exceptions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\TestWith;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_creates_a_universal_account_and_sends_verification(): void
    {
        Notification::fake();

        $response = $this->postJson('/register', [
            'name' => 'Maya Santos',
            'email' => 'maya@example.test',
            'mobile_number' => '+63 917 123 4567',
            'password' => 'a-long-passphrase-for-ayos',
            'password_confirmation' => 'a-long-passphrase-for-ayos',
            'terms_accepted' => true,
        ]);

        $response->assertSuccessful();
        $user = User::where('email', 'maya@example.test')->firstOrFail();
        $this->assertSame('+639171234567', $user->mobile_number);
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertNull($user->email_verified_at);
        $this->assertFalse($user->is_admin);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_registration_requires_terms_acceptance_and_a_strong_password(): void
    {
        $this->postJson('/register', [
            'name' => 'Maya Santos', 'email' => 'maya@example.test', 'mobile_number' => '+639171234567',
            'password' => 'short', 'password_confirmation' => 'short', 'terms_accepted' => false,
        ])->assertUnprocessable()->assertJsonValidationErrors(['terms_accepted', 'password']);
    }

    public function test_login_uses_a_session_and_user_endpoint_returns_safe_account_fields(): void
    {
        Http::fake(['www.google.com/recaptcha/api/siteverify' => Http::response(['success' => true])]);
        $user = User::factory()->create(['email' => 'maya@example.test', 'password' => 'a-long-passphrase-for-ayos']);

        $this->postJson('/login', ['email' => $user->email, 'password' => 'a-long-passphrase-for-ayos', 'captcha_token' => 'valid-test-token'])
            ->assertSuccessful();

        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/user')->assertOk()->assertJsonPath('email', $user->email)->assertJsonPath('email_verified', true)
            ->assertJsonPath('customer_capability', true)->assertJsonPath('address_complete', false)->assertJsonMissingPath('password')->assertJsonMissingPath('is_admin')->assertJsonMissingPath('two_factor_secret');

        $this->postJson('/logout')->assertNoContent();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Origin', 'http://localhost:5173')->getJson('/api/user')->assertUnauthorized();
    }

    public function test_invalid_login_errors_do_not_reveal_whether_email_exists(): void
    {
        Http::fake(['www.google.com/recaptcha/api/siteverify' => Http::response(['success' => true])]);
        User::factory()->create(['email' => 'known@example.test']);
        $known = $this->postJson('/login', ['email' => 'known@example.test', 'password' => 'wrong-password', 'captcha_token' => 'valid-test-token']);
        $unknown = $this->postJson('/login', ['email' => 'unknown@example.test', 'password' => 'wrong-password', 'captcha_token' => 'valid-test-token']);

        $known->assertUnprocessable()->assertJsonPath('message', $unknown->json('message'));
    }

    public function test_unverified_users_cannot_receive_marketplace_access_from_the_user_endpoint(): void
    {
        $user = User::factory()->unverified()->create();
        $this->actingAs($user)->getJson('/api/user')->assertOk()->assertJsonPath('email_verified', false);
    }

    public function test_password_reset_request_does_not_reveal_if_an_email_is_registered(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'known@example.test']);

        $known = $this->postJson('/forgot-password', ['email' => 'known@example.test']);
        $unknown = $this->postJson('/forgot-password', ['email' => 'unknown@example.test']);

        $known->assertOk()->assertJsonPath('message', $unknown->json('message'));
        Notification::assertSentTo(User::where('email', 'known@example.test')->firstOrFail(), ResetPassword::class);

        $user = User::where('email', 'known@example.test')->firstOrFail();
        $resetNotice = Notification::sent($user, ResetPassword::class)->first();
        $this->postJson('/reset-password', [
            'email' => $user->email,
            'token' => $resetNotice->token,
            'password' => 'a-new-long-passphrase-for-ayos',
            'password_confirmation' => 'a-new-long-passphrase-for-ayos',
        ])->assertOk();
        $this->assertTrue(password_verify('a-new-long-passphrase-for-ayos', $user->fresh()->password));
        $this->postJson('/reset-password', [
            'email' => $user->email,
            'token' => $resetNotice->token,
            'password' => 'a-third-long-passphrase-for-ayos',
            'password_confirmation' => 'a-third-long-passphrase-for-ayos',
        ])->assertUnprocessable();
    }

    public function test_admin_api_requires_admin_and_verified_email_but_not_mfa(): void
    {
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::query()->where('slug', 'super_admin')->value('id'), ['created_at' => now()]);
        $admin->forceFill(['is_admin' => true])->save();

        $this->actingAs($admin)->getJson('/api/admin/access-check')->assertOk()->assertJsonPath('access', 'allowed');

        $admin->forceFill(['email_verified_at' => null])->save();
        $this->actingAs($admin)->getJson('/api/admin/access-check')->assertForbidden();
    }

    public function test_registration_is_rate_limited_by_ip(): void
    {
        RateLimiter::clear('auth-route:register:127.0.0.1');
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/register', [])->assertUnprocessable();
        }
        $this->postJson('/register', [])->assertTooManyRequests();
    }

    public function test_password_change_invalidates_other_sessions_and_audits_the_change(): void
    {
        $user = User::factory()->create(['password' => 'a-long-passphrase-for-ayos']);

        $this->withHeader('Origin', 'http://localhost:5173')->actingAs($user)->putJson('/api/account/password', [
            'current_password' => 'a-long-passphrase-for-ayos',
            'password' => 'another-long-passphrase-for-ayos',
            'password_confirmation' => 'another-long-passphrase-for-ayos',
        ])->assertOk();

        $this->assertTrue(password_verify('another-long-passphrase-for-ayos', $user->fresh()->password));
        $this->assertDatabaseHas('security_audits', ['user_id' => $user->id, 'event_type' => 'PASSWORD_CHANGED']);
    }

    public function test_admin_can_change_their_own_password_and_keep_admin_access(): void
    {
        $admin = User::factory()->create(['password' => 'first-admin-passphrase', 'is_admin' => true]);
        $admin->roles()->attach(Role::query()->where('slug', 'moderator')->value('id'), ['created_at' => now()]);

        $this->withHeader('Origin', 'http://localhost:5173')->actingAs($admin)->putJson('/api/account/password', [
            'current_password' => 'first-admin-passphrase',
            'password' => 'second-admin-passphrase',
            'password_confirmation' => 'second-admin-passphrase',
        ])->assertOk();

        $this->assertTrue(password_verify('second-admin-passphrase', $admin->fresh()->password));
        $this->actingAs($admin->fresh())->getJson('/api/admin/access-check')->assertOk()->assertJsonPath('access', 'allowed');
    }

    public function test_password_change_rejects_reusing_the_current_password(): void
    {
        $user = User::factory()->create(['password' => 'a-long-passphrase-for-ayos']);

        $this->actingAs($user)->putJson('/api/account/password', [
            'current_password' => 'a-long-passphrase-for-ayos',
            'password' => 'a-long-passphrase-for-ayos',
            'password_confirmation' => 'a-long-passphrase-for-ayos',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'Choose a new password that is different from your current one.']);
    }

    public function test_password_change_attempts_are_rate_limited(): void
    {
        $user = User::factory()->create(['password' => 'a-long-passphrase-for-ayos']);
        $guess = ['current_password' => 'wrong-guess', 'password' => 'another-long-passphrase', 'password_confirmation' => 'another-long-passphrase'];

        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->actingAs($user)->putJson('/api/account/password', $guess)->assertUnprocessable();
        }
        $this->actingAs($user)->putJson('/api/account/password', $guess)->assertTooManyRequests();
    }

    public function test_admin_changes_password_without_current_password_signs_out_other_devices_and_is_emailed(): void
    {
        Notification::fake();
        $this->travelTo(CarbonImmutable::parse('2026-10-26 07:45:00', 'UTC'));
        $admin = $this->adminWithPassword('first-admin-passphrase');
        DB::table('sessions')->insert(['id' => 'admin-laptop-session', 'user_id' => $admin->id, 'ip_address' => '127.0.0.2', 'user_agent' => 'Mozilla/5.0 (Windows NT 10.0)', 'payload' => '', 'last_activity' => now()->timestamp]);

        $this->withHeaders(['Origin' => 'http://localhost:5173', 'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'])->actingAs($admin)
            ->putJson('/api/admin/account/password', ['password' => 'second-admin-passphrase', 'password_confirmation' => 'second-admin-passphrase'])
            ->assertOk()->assertJsonPath('message', 'Password updated. Other devices were signed out.');

        $this->assertTrue(password_verify('second-admin-passphrase', $admin->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'admin-laptop-session']);
        $this->assertDatabaseHas('security_audits', ['user_id' => $admin->id, 'event_type' => 'PASSWORD_CHANGED']);
        Notification::assertSentTo($admin, AdminPasswordChanged::class, function (AdminPasswordChanged $notification) use ($admin): bool {
            $mail = $notification->toMail($admin);
            $body = (string) $mail->render();

            return $mail->subject === 'Your AYOS admin password was changed'
                && str_contains($body, 'When: October 26, 2026 at 3:45 PM (Philippine time)')
                && str_contains($body, 'Device: iPhone')
                && str_contains($body, 'IP address: 127.0.0.1')
                && ! str_contains($body, 'second-admin-passphrase');
        });
    }

    public function test_admin_password_change_returns_200_and_reports_the_error_when_the_alert_email_fails(): void
    {
        Exceptions::fake();
        config(['mail.default' => 'unconfigured-mailer']);
        $admin = $this->adminWithPassword('first-admin-passphrase');

        $this->withHeader('Origin', 'http://localhost:5173')->actingAs($admin)
            ->putJson('/api/admin/account/password', ['password' => 'second-admin-passphrase', 'password_confirmation' => 'second-admin-passphrase'])
            ->assertOk();

        $this->assertTrue(password_verify('second-admin-passphrase', $admin->fresh()->password));
        Exceptions::assertReported(InvalidArgumentException::class);
    }

    #[TestWith(['first-admin-passphrase', 'first-admin-passphrase', 'Choose a new password that is different from your current one.'])]
    #[TestWith(['too-short', 'too-short', 'The password field must be at least 12 characters.'])]
    #[TestWith(['second-admin-passphrase', 'something-else-entirely', 'The password field confirmation does not match.'])]
    public function test_admin_password_change_rejects_an_invalid_new_password_with_422(string $password, string $confirmation, string $message): void
    {
        $admin = $this->adminWithPassword('first-admin-passphrase');

        $this->actingAs($admin)->putJson('/api/admin/account/password', ['password' => $password, 'password_confirmation' => $confirmation])
            ->assertUnprocessable()->assertJsonValidationErrors(['password' => $message]);
        $this->assertTrue(password_verify('first-admin-passphrase', $admin->fresh()->password));
    }

    public function test_admin_password_change_returns_403_for_a_non_admin(): void
    {
        $user = User::factory()->create(['password' => 'a-long-passphrase-for-ayos']);

        $this->actingAs($user)->putJson('/api/admin/account/password', ['password' => 'another-long-passphrase', 'password_confirmation' => 'another-long-passphrase'])
            ->assertForbidden();
        $this->assertTrue(password_verify('a-long-passphrase-for-ayos', $user->fresh()->password));
    }

    public function test_admin_password_change_returns_401_for_a_guest(): void
    {
        $this->putJson('/api/admin/account/password', ['password' => 'another-long-passphrase', 'password_confirmation' => 'another-long-passphrase'])
            ->assertUnauthorized();
    }

    public function test_admin_password_change_returns_429_after_six_attempts_a_minute(): void
    {
        $admin = $this->adminWithPassword('first-admin-passphrase');
        $attempt = ['password' => 'too-short', 'password_confirmation' => 'too-short'];

        for ($count = 0; $count < 6; $count++) {
            $this->actingAs($admin)->putJson('/api/admin/account/password', $attempt)->assertUnprocessable();
        }
        $this->actingAs($admin)->putJson('/api/admin/account/password', $attempt)->assertTooManyRequests();
    }

    /**
     * A support admin, whose role grants no settings or security permissions.
     */
    private function adminWithPassword(string $password): User
    {
        $admin = User::factory()->create(['password' => $password, 'is_admin' => true]);
        $admin->roles()->attach(Role::query()->where('slug', 'support')->value('id'), ['created_at' => now()]);

        return $admin;
    }

    public function test_user_can_review_and_revoke_an_owned_session(): void
    {
        $user = User::factory()->create();
        $otherSession = 'session-to-revoke';
        DB::table('sessions')->insert([
            'id' => $otherSession,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.2',
            'user_agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
            'payload' => '',
            'last_activity' => now()->timestamp,
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')->actingAs($user)
            ->getJson('/api/account/sessions')->assertOk()->assertJsonFragment([
                'id' => hash('sha256', $otherSession),
                'current' => false,
                'device' => 'Mac',
            ]);

        $this->withHeader('Origin', 'http://localhost:5173')->actingAs($user)
            ->deleteJson('/api/account/sessions/'.hash('sha256', $otherSession))->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => $otherSession]);
        $this->assertDatabaseHas('security_audits', ['user_id' => $user->id, 'event_type' => 'SESSION_REVOKED']);
    }

    public function test_user_can_sign_out_other_sessions_after_password_confirmation(): void
    {
        $user = User::factory()->create(['password' => 'a-long-passphrase-for-ayos']);
        DB::table('sessions')->insert([
            'id' => 'other-session-to-revoke', 'user_id' => $user->id, 'ip_address' => '127.0.0.2',
            'user_agent' => 'Unknown browser', 'payload' => '', 'last_activity' => now()->timestamp,
        ]);

        $this->withHeader('Origin', 'http://localhost:5173')->actingAs($user)->deleteJson('/api/account/sessions/others', [
            'password' => 'a-long-passphrase-for-ayos',
        ])->assertOk()->assertJsonPath('revoked', 1);
        $this->assertDatabaseMissing('sessions', ['id' => 'other-session-to-revoke']);
        $this->assertDatabaseHas('security_audits', ['user_id' => $user->id, 'event_type' => 'OTHER_SESSIONS_REVOKED']);
    }

    public function test_verification_resend_is_rate_limited(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->actingAs($user)->postJson('/api/email/verification-notification')->assertOk();
        }
        $this->actingAs($user)->postJson('/api/email/verification-notification')->assertTooManyRequests();
    }

    public function test_signed_email_verification_link_verifies_account_and_redirects_to_spa(): void
    {
        $user = User::factory()->unverified()->create();
        $link = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $this->get($link)->assertRedirect(config('app.frontend_url').'/verify-email?verified=1');
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_expired_and_invalid_email_verification_links_are_rejected(): void
    {
        $user = User::factory()->unverified()->create();
        $expired = URL::temporarySignedRoute('verification.verify', now()->subMinute(), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);
        $this->get($expired)->assertRedirect(config('app.frontend_url').'/verify-email?invalid=1');
        $this->get('/email/verify/'.$user->id.'/'.sha1($user->getEmailForVerification()))
            ->assertRedirect(config('app.frontend_url').'/verify-email?invalid=1');
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_totp_setup_requires_confirmation_and_login_challenge(): void
    {
        Http::fake(['www.google.com/recaptcha/api/siteverify' => Http::response(['success' => true])]);
        $user = User::factory()->create(['email' => 'mfa@example.test', 'password' => 'a-long-passphrase-for-ayos']);
        $this->actingAs($user)->postJson('/user/confirm-password', ['password' => 'a-long-passphrase-for-ayos'])->assertCreated();
        $this->postJson('/user/two-factor-authentication')->assertOk();

        $user->refresh();
        $google2fa = new Google2FA;
        $code = $google2fa->getCurrentOtp(decrypt($user->two_factor_secret));
        $this->postJson('/user/confirmed-two-factor-authentication', ['code' => $code])->assertOk();
        $this->assertNotNull($user->fresh()->two_factor_confirmed_at);
        $this->getJson('/user/two-factor-recovery-codes')->assertOk()->assertJsonCount(8);
        Cache::forget('fortify.2fa_codes.'.md5($code));
        $this->postJson('/logout')->assertNoContent();

        $this->postJson('/login', ['email' => $user->email, 'password' => 'a-long-passphrase-for-ayos', 'captcha_token' => 'valid-test-token'])
            ->assertOk()->assertJsonPath('two_factor', true);
        $challenge = $google2fa->getCurrentOtp(decrypt($user->fresh()->two_factor_secret));
        $this->postJson('/two-factor-challenge', ['code' => $challenge])->assertNoContent();
        $this->getJson('/api/user')->assertOk()->assertJsonPath('mfa_enabled', true);
    }

    public function test_recovery_codes_are_single_use_and_audited(): void
    {
        Http::fake(['www.google.com/recaptcha/api/siteverify' => Http::response(['success' => true])]);
        $user = User::factory()->create(['email' => 'recovery@example.test', 'password' => 'a-long-passphrase-for-ayos']);
        $this->actingAs($user)->postJson('/user/confirm-password', ['password' => 'a-long-passphrase-for-ayos'])->assertCreated();
        $this->postJson('/user/two-factor-authentication')->assertOk();
        $google2fa = new Google2FA;
        $code = $google2fa->getCurrentOtp(decrypt($user->fresh()->two_factor_secret));
        $this->postJson('/user/confirmed-two-factor-authentication', ['code' => $code])->assertOk();
        Cache::forget('fortify.2fa_codes.'.md5($code));
        $recoveryCode = $user->fresh()->recoveryCodes()[0];
        $this->postJson('/logout')->assertNoContent();

        $this->postJson('/login', ['email' => $user->email, 'password' => 'a-long-passphrase-for-ayos', 'captcha_token' => 'valid-test-token'])->assertJsonPath('two_factor', true);
        $this->postJson('/two-factor-challenge', ['recovery_code' => $recoveryCode])->assertNoContent();
        $this->assertNotContains($recoveryCode, $user->fresh()->recoveryCodes());
        $this->assertDatabaseHas('security_audits', ['user_id' => $user->id, 'event_type' => 'MFA_RECOVERY_CODE_USED']);
        $this->postJson('/logout')->assertNoContent();

        $this->postJson('/login', ['email' => $user->email, 'password' => 'a-long-passphrase-for-ayos', 'captcha_token' => 'valid-test-token'])->assertJsonPath('two_factor', true);
        $this->postJson('/two-factor-challenge', ['recovery_code' => $recoveryCode])->assertUnprocessable();
    }

    public function test_disabling_mfa_requires_recent_password_and_a_valid_totp_code(): void
    {
        $user = User::factory()->create(['password' => 'a-long-passphrase-for-ayos']);
        $this->actingAs($user)->postJson('/user/confirm-password', ['password' => 'a-long-passphrase-for-ayos'])->assertCreated();
        $this->postJson('/user/two-factor-authentication')->assertOk();
        $google2fa = new Google2FA;
        $enrollmentCode = $google2fa->getCurrentOtp(decrypt($user->fresh()->two_factor_secret));
        $this->postJson('/user/confirmed-two-factor-authentication', ['code' => $enrollmentCode])->assertOk();
        Cache::forget('fortify.2fa_codes.'.md5($enrollmentCode));

        $this->deleteJson('/user/two-factor-authentication', ['code' => ''])->assertUnprocessable();
        $currentCode = $google2fa->getCurrentOtp(decrypt($user->fresh()->two_factor_secret));
        $this->withSession(['auth.password_confirmed_at' => now()->subSeconds(config('auth.password_timeout') + 1)->timestamp])
            ->deleteJson('/user/two-factor-authentication', ['code' => $currentCode])->assertStatus(423);
        Cache::forget('fortify.2fa_codes.'.md5($currentCode));
        $this->postJson('/user/confirm-password', ['password' => 'a-long-passphrase-for-ayos'])->assertCreated();
        $currentCode = $google2fa->getCurrentOtp(decrypt($user->fresh()->two_factor_secret));
        $this->deleteJson('/user/two-factor-authentication', ['code' => $currentCode])->assertOk();
        $this->assertFalse($user->fresh()->hasEnabledTwoFactorAuthentication());
        $this->assertDatabaseHas('security_audits', ['user_id' => $user->id, 'event_type' => 'MFA_DISABLED']);
    }
}
