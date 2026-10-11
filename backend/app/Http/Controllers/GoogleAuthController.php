<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        $clientId = config('services.google.client_id');
        $redirectUri = config('services.google.redirect');

        abort_unless(filled($clientId) && filled(config('services.google.client_secret')) && filled($redirectUri), 503, 'Google sign-in is not configured.');

        $state = Str::random(64);
        $request->session()->put([
            'google.oauth_state' => $state,
            'google.oauth_state_issued_at' => now()->timestamp,
        ]);

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.$query);
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontend = rtrim(config('app.frontend_url'), '/');
        $state = $request->session()->pull('google.oauth_state');
        $issuedAt = $request->session()->pull('google.oauth_state_issued_at');

        if ($request->filled('error') || ! $request->filled('code') || ! is_string($state)
            || ! is_string($request->query('state')) || ! hash_equals($state, $request->query('state'))
            || ! is_numeric($issuedAt) || now()->timestamp - (int) $issuedAt > 600) {
            return redirect()->away($frontend.'/login?google_error=cancelled');
        }

        try {
            $tokenResponse = Http::asForm()->acceptJson()->timeout(10)->post('https://oauth2.googleapis.com/token', [
                'code' => $request->query('code'),
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => config('services.google.redirect'),
                'grant_type' => 'authorization_code',
            ]);

            if (! $tokenResponse->successful() || ! filled($tokenResponse->json('access_token'))) {
                return redirect()->away($frontend.'/login?google_error=exchange');
            }

            $profileResponse = Http::withToken($tokenResponse->json('access_token'))
                ->acceptJson()->timeout(10)->get('https://openidconnect.googleapis.com/v1/userinfo');

            $profile = $profileResponse->json();
            if (! $profileResponse->successful() || ! is_array($profile)
                || ! filter_var($profile['email'] ?? null, FILTER_VALIDATE_EMAIL)
                || ($profile['email_verified'] ?? false) !== true
                || ! is_string($profile['sub'] ?? null) || ! filled($profile['sub'])) {
                return redirect()->away($frontend.'/login?google_error=profile');
            }
        } catch (\Throwable) {
            return redirect()->away($frontend.'/login?google_error=unavailable');
        }

        $email = Str::lower($profile['email']);
        $googleId = $profile['sub'];
        $user = User::query()->where('google_id', $googleId)->first();

        if ($user && ! hash_equals(Str::lower($user->email), $email)) {
            return redirect()->away($frontend.'/login?google_error=account');
        }

        $user ??= User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user) {
            $request->session()->put('google.pending_profile', [
                'google_id' => $googleId,
                'email' => $email,
                'name' => trim((string) ($profile['name'] ?? '')) ?: Str::before($email, '@'),
            ]);

            return redirect()->away($frontend.'/google/complete');
        }

        if ($user->google_id && ! hash_equals((string) $user->google_id, $googleId)) {
            return redirect()->away($frontend.'/login?google_error=account');
        }

        $user->forceFill([
            'google_id' => $googleId,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        if ($user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put(['login.id' => $user->getKey(), 'login.remember' => false]);

            return redirect()->away($frontend.'/mfa/challenge');
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->away($frontend.($user->hasCompleteAddress() ? '/account' : '/account/address'));
    }

    public function pendingProfile(Request $request): JsonResponse
    {
        $profile = $request->session()->get('google.pending_profile');
        abort_unless(is_array($profile), 404, 'This Google sign-up has expired. Start again to continue.');

        return response()->json(['name' => $profile['name'], 'email' => $profile['email']]);
    }

    public function complete(Request $request): JsonResponse
    {
        $profile = $request->session()->get('google.pending_profile');
        abort_unless(is_array($profile), 410, 'This Google sign-up has expired. Start again to continue.');

        $validated = $request->validate([
            'mobile_number' => ['required', 'string', 'max:32', 'regex:/^\+?[0-9().\s-]{7,32}$/'],
            'terms_accepted' => ['accepted'],
        ]);

        if (User::query()->whereRaw('LOWER(email) = ?', [$profile['email']])->exists()) {
            $request->session()->forget('google.pending_profile');

            throw ValidationException::withMessages(['email' => 'An account already uses this email. Sign in instead.']);
        }

        $user = User::create([
            'name' => $profile['name'],
            'email' => $profile['email'],
            'mobile_number' => preg_replace('/[().\s-]+/', '', $validated['mobile_number']),
            'password' => Str::random(64),
        ]);
        $user->forceFill([
            'google_id' => $profile['google_id'],
            'email_verified_at' => now(),
            'terms_accepted_at' => now(),
        ])->save();

        $request->session()->forget('google.pending_profile');
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['created' => true]);
    }
}
