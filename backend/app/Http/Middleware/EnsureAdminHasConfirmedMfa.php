<?php

namespace App\Http\Middleware;

use App\Services\SecurityAuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminHasConfirmedMfa
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user?->is_admin, 403);

        if (! $user->hasVerifiedEmail() || ! $user->hasEnabledTwoFactorAuthentication()) {
            app(SecurityAuditLogger::class)->record('ADMIN_MFA_REQUIRED', $user->id, $request);

            return response()->json(['message' => 'Set up and confirm two-factor authentication before using admin tools.'], 403);
        }

        return $next($request);
    }
}
