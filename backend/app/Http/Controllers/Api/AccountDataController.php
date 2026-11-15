<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeleteAccountRequest;
use App\Services\AccountData;
use App\Services\AccountDeletion;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * The Data Privacy Act rights a person can use on their own: download their data, and delete their account.
 */
class AccountDataController extends Controller
{
    public function __construct(private SecurityAuditLogger $audit) {}

    public function export(Request $request, AccountData $data): JsonResponse
    {
        $this->audit->record('DATA_EXPORTED', $request->user()->id, $request);

        return response()->json($data->export($request->user()), 200, [
            'Content-Disposition' => 'attachment; filename="ayos-my-data-'.now()->format('Y-m-d').'.json"',
            'Cache-Control' => 'private, no-store',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** What would stop deletion right now, so the page can explain it before asking for a password. */
    public function deletionCheck(Request $request, AccountDeletion $deletion): JsonResponse
    {
        return response()->json([
            'blockers' => $deletion->blockers($request->user()),
            'confirmWith' => $request->user()->google_id !== null ? 'email' : 'password',
        ]);
    }

    public function destroy(DeleteAccountRequest $request, AccountDeletion $deletion): JsonResponse
    {
        $user = $request->user();
        $blockers = $deletion->blockers($user);
        if ($blockers) {
            return response()->json(['message' => $blockers[0], 'blockers' => $blockers], 409);
        }

        $deletion->delete($user);
        // Sign this browser out too; every other session was already removed with the account.
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Your AYOS account has been deleted.']);
    }
}
