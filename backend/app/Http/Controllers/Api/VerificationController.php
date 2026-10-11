<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class VerificationController extends Controller
{
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = User::findOrFail($id);
        abort_unless(hash_equals(sha1($user->getEmailForVerification()), $hash), 403);

        if (! $user->hasVerifiedEmail()) {
            abort_unless(URL::hasValidSignature($request), 403);
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect(rtrim(config('app.frontend_url'), '/').'/verify-email?verified=1');
    }

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json(['message' => 'If your account still needs verification, we sent a fresh link.']);
    }
}
