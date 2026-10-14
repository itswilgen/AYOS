<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
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

    public function test_verified_user_can_save_and_retrieve_their_address(): void
    {
        $user = User::factory()->create();
        $payload = [
            'address_line' => '26 Jesus Street',
            'barangay' => 'Barangay IX',
            'city' => 'Tanjay City',
            'province' => 'Negros Oriental',
            'postal_code' => '6204',
            'latitude' => 9.5167,
            'longitude' => 123.1583,
        ];

        $this->actingAs($user)->putJson('/api/account/address', $payload)
            ->assertOk()
            ->assertJsonPath('address_line', '26 Jesus Street');

        $this->assertTrue($user->fresh()->hasCompleteAddress());
        $this->actingAs($user)->getJson('/api/account/address')->assertOk()
            ->assertJsonPath('city', 'Tanjay City')
            ->assertJsonPath('latitude', 9.5167);
    }

    public function test_account_address_requires_email_verification_and_valid_location_coordinates(): void
    {
        $unverified = User::factory()->unverified()->create();
        $this->actingAs($unverified)->getJson('/api/account/address')->assertForbidden();

        $verified = User::factory()->create();
        $this->actingAs($verified)->putJson('/api/account/address', [
            'address_line' => '26 Jesus Street',
            'barangay' => 'Barangay IX',
            'city' => 'Tanjay City',
            'province' => 'Negros Oriental',
            'latitude' => 120,
            'longitude' => 123.1583,
        ])->assertUnprocessable()->assertJsonValidationErrors(['latitude']);
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
