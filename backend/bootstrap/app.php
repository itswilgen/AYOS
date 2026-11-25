<?php

use App\Http\Middleware\EnforcePlatformAvailability;
use App\Http\Middleware\EnsureAccountActive;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\RequireAdminPermission;
use App\Http\Middleware\RequireMfaCodeToDisable;
use App\Http\Middleware\ThrottleSensitiveAuthRoutes;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // Live chat: the socket login sits next to the API and needs the same signed-in, verified, active account.
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum', 'verified', 'account.active']])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        // The general API limit ("api" in AppServiceProvider) on every /api route.
        $middleware->throttleApi();
        // Signed-out API calls get a plain 401 (the API has no login page to send them to); anything else goes
        // to the app's own login page. Without this, a document link opened in a new tab crashed with a 500.
        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('api/*') ? null : rtrim((string) config('app.frontend_url'), '/').'/login');
        $middleware->api(prepend: [EnforcePlatformAvailability::class]);
        $middleware->web(append: [ThrottleSensitiveAuthRoutes::class, RequireMfaCodeToDisable::class]);
        $middleware->alias([
            'admin' => EnsureAdmin::class,
            'admin.permission' => RequireAdminPermission::class,
            'account.active' => EnsureAccountActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*')
                || $request->is('login')
                || $request->is('register')
                || $request->expectsJson(),
        );
        $exceptions->render(function (InvalidSignatureException $exception, Request $request) {
            if ($request->is('email/verify/*')) {
                return redirect(rtrim(config('app.frontend_url'), '/').'/verify-email?invalid=1');
            }
        });
    })->create();
