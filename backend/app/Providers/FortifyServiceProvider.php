<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\VerifyRecaptcha;
use App\Http\Responses\GenericPasswordResetLinkResponse;
use App\Http\Responses\JsonLoginResponse;
use App\Http\Responses\JsonRegisterResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Actions\AttemptToAuthenticate;
use Laravel\Fortify\Actions\CanonicalizeUsername;
use Laravel\Fortify\Actions\EnsureLoginIsNotThrottled;
use Laravel\Fortify\Actions\PrepareAuthenticatedSession;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\RegisterResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register application services.
     */
    public function register(): void
    {
        $this->app->singleton(
            LoginResponse::class,
            JsonLoginResponse::class
        );

        $this->app->singleton(
            RegisterResponse::class,
            JsonRegisterResponse::class
        );

        $this->app->bind(
            FailedPasswordResetLinkRequestResponse::class,
            GenericPasswordResetLinkResponse::class
        );

        $this->app->bind(
            SuccessfulPasswordResetLinkRequestResponse::class,
            GenericPasswordResetLinkResponse::class
        );
    }

    /**
     * Bootstrap application services.
     */
    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);

        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);

        Fortify::redirectUserForTwoFactorAuthenticationUsing(
            RedirectIfTwoFactorAuthenticatable::class
        );

        /*
         * Login authentication pipeline with Google reCAPTCHA.
         */
        Fortify::authenticateThrough(function (Request $request) {
            return array_values(array_filter([
                EnsureLoginIsNotThrottled::class,

                config('fortify.lowercase_usernames')
                    ? CanonicalizeUsername::class
                    : null,

                VerifyRecaptcha::class,

                RedirectIfTwoFactorAuthenticatable::class,

                AttemptToAuthenticate::class,

                PrepareAuthenticatedSession::class,
            ]));
        });

        /*
         * Limit login attempts.
         */
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(
                Str::lower($request->input(Fortify::username()))
                . '|'
                . $request->ip()
            );

            return Limit::perMinute(5)->by($throttleKey);
        });

        /*
         * Limit two-factor authentication attempts.
         */
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->session()->get('login.id')
            );
        });
    }
}
