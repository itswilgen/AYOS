<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;

class RequireMfaCodeToDisable
{
    public function __construct(private readonly RateLimiter $limiter) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('DELETE') || $request->path() !== 'user/two-factor-authentication') {
            return $next($request);
        }

        $user = $request->user();
        abort_unless($user, 401);
        $key = 'mfa-disable:'.$user->id.':'.$request->ip();
        if ($this->limiter->tooManyAttempts($key, 5)) {
            $retryAfter = $this->limiter->availableIn($key);

            return response()->json(['message' => 'Too many attempts. Please wait and try again.'], 429)
                ->header('Retry-After', (string) $retryAfter);
        }
        $this->limiter->hit($key, 60);

        $code = (string) $request->input('code', '');
        $secret = $user->two_factor_secret ? Fortify::currentEncrypter()->decrypt($user->two_factor_secret) : '';
        if (strlen($code) !== 6 || ! app(TwoFactorAuthenticationProvider::class)->verify($secret, $code)) {
            throw ValidationException::withMessages(['code' => ['Enter a current code from your authenticator to turn off two-factor authentication.']]);
        }

        return $next($request);
    }
}
