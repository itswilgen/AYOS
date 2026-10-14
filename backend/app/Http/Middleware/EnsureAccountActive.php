<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_if($user && $user->status === 'suspended' && ! $user->hasAdminAccess(), 423, 'This account is suspended. Contact AYOS support for assistance.');

        return $next($request);
    }
}
