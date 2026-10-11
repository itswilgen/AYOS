<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ThrottleSensitiveAuthRoutes
{
    public function __construct(private readonly RateLimiter $limiter) {}

    public function handle(Request $request, Closure $next): Response
    {
        $limits = [
            'register' => 5,
            'forgot-password' => 5,
            'reset-password' => 10,
            'user/confirm-password' => 5,
            'user/confirmed-two-factor-authentication' => 5,
            'user/two-factor-recovery-codes' => 5,
        ];
        $limit = $limits[$request->path()] ?? null;

        if ($request->isMethod('POST') && $limit !== null) {
            $key = 'auth-route:'.$request->path().':'.$request->ip();
            if ($this->limiter->tooManyAttempts($key, $limit)) {
                $retryAfter = $this->limiter->availableIn($key);

                return response()->json([
                    'message' => 'Too many attempts. Please wait a moment and try again.',
                    'retry_after' => $retryAfter,
                ], 429)->header('Retry-After', (string) $retryAfter);
            }

            $this->limiter->hit($key, 60);
        }

        return $next($request);
    }
}
