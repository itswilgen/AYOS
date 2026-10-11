<?php

namespace App\Providers;

use App\Models\User;
use App\Services\SecurityAuditLogger;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Events\RecoveryCodeReplaced;
use Laravel\Fortify\Events\RecoveryCodesGenerated;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;
use Laravel\Fortify\Events\TwoFactorAuthenticationDisabled;
use Laravel\Fortify\Events\TwoFactorAuthenticationEnabled;
use Laravel\Fortify\Events\TwoFactorAuthenticationFailed;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ResetPasswordNotification::createUrlUsing(fn (User $user, string $token): string => rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query([
            'token' => $token,
            'email' => $user->getEmailForPasswordReset(),
        ]));

        Event::listen(Login::class, function (Login $event): void {
            app(SecurityAuditLogger::class)->record('LOGIN_SUCCEEDED', $event->user->id, request());
        });
        Event::listen(Failed::class, function (Failed $event): void {
            $user = $event->user instanceof User ? $event->user : null;
            app(SecurityAuditLogger::class)->record('LOGIN_FAILED', $user?->id, request());
        });
        Event::listen(Logout::class, function (Logout $event): void {
            app(SecurityAuditLogger::class)->record('LOGOUT', $event->user?->id, request());
        });
        Event::listen(PasswordReset::class, function (PasswordReset $event): void {
            app(SecurityAuditLogger::class)->record('PASSWORD_RESET', $event->user->id, request());
        });
        Event::listen(Verified::class, function (Verified $event): void {
            app(SecurityAuditLogger::class)->record('EMAIL_VERIFIED', $event->user->id, request());
        });
        Event::listen(TwoFactorAuthenticationEnabled::class, fn ($event) => app(SecurityAuditLogger::class)->record('MFA_ENABLED', $event->user->id, request()));
        Event::listen(TwoFactorAuthenticationConfirmed::class, fn ($event) => app(SecurityAuditLogger::class)->record('MFA_CONFIRMED', $event->user->id, request()));
        Event::listen(TwoFactorAuthenticationDisabled::class, fn ($event) => app(SecurityAuditLogger::class)->record('MFA_DISABLED', $event->user->id, request()));
        Event::listen(RecoveryCodesGenerated::class, fn ($event) => app(SecurityAuditLogger::class)->record('MFA_RECOVERY_CODES_REGENERATED', $event->user->id, request()));
        Event::listen(TwoFactorAuthenticationFailed::class, fn ($event) => app(SecurityAuditLogger::class)->record('MFA_CHALLENGE_FAILED', $event->user->id, request()));
        Event::listen(RecoveryCodeReplaced::class, fn ($event) => app(SecurityAuditLogger::class)->record('MFA_RECOVERY_CODE_USED', $event->user->id, request()));
    }
}
