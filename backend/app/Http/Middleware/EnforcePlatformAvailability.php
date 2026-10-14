<?php

namespace App\Http\Middleware;

use App\Services\PlatformSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforcePlatformAvailability
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('api/admin/*') || $request->is('api/platform-state') || $request->is('api/user')) {
            return $next($request);
        }

        if (app(PlatformSettings::class)->get('maintenance_mode', false)) {
            return response()->json(['message' => 'AYOS is temporarily under maintenance. Please check back soon.'], 503);
        }

        return $next($request);
    }
}
