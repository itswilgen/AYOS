<?php

namespace App\Actions\Fortify;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class VerifyRecaptcha
{
    public function handle(Request $request, \Closure $next): mixed
    {
        $token = $request->input('captcha_token');
        $secret = config('services.recaptcha.secret');

        # to validate submitted capt. token and capt. secret
        if (! is_string($token) || $token === '' || ! is_string($secret) || $secret === '') 
        {
            throw ValidationException::withMessages([
                'captcha' => 'Please complete the CAPTCHA verification.',
            ]);
        }

        try {
            $response = Http::asForm()
                ->timeout(5)
                ->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ]);

            if (! $response->successful() || ! $response->json('success')) 
            {
                throw ValidationException::withMessages([
                    'captcha' => 'CAPTCHA verification failed. Please try again.',
                ]);
            }
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'captcha' => 'CAPTCHA verification is temporarily unavailable. Please try again.',
            ]);
        }

        return $next($request);
    }
}
