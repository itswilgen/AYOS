<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ChangeOwnPasswordRequest;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\RevokeOtherSessionsRequest;
use App\Models\User;
use App\Notifications\AdminPasswordChanged;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class AccountSecurityController extends Controller
{
    public function sessions(Request $request): JsonResponse
    {
        $sessions = DB::table(config('session.table'))
            ->where('user_id', $request->user()->id)
            ->where('last_activity', '>=', now()->subMinutes(config('session.lifetime'))->timestamp)
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity']);

        return response()->json($sessions->map(fn ($session) => [
            'id' => hash('sha256', $session->id),
            'current' => hash_equals($session->id, $request->session()->getId()),
            'device' => $this->deviceName((string) $session->user_agent),
            'ip_address' => $session->ip_address,
            'last_active_at' => gmdate(DATE_ATOM, $session->last_activity),
        ]));
    }

    public function revokeSession(Request $request, string $id, SecurityAuditLogger $audit): JsonResponse
    {
        $user = $request->user();
        $sessions = DB::table(config('session.table'))->where('user_id', $user->id)->get(['id']);
        $target = $sessions->first(fn ($session) => hash_equals(hash('sha256', $session->id), $id));

        if (! $target) {
            abort(404);
        }
        if (hash_equals($target->id, $request->session()->getId())) {
            return response()->json(['message' => 'Use sign out to end the current session.'], 422);
        }

        DB::table(config('session.table'))->where('id', $target->id)->delete();
        $this->rotateRememberToken($user);
        $audit->record('SESSION_REVOKED', $user->id, $request);

        return response()->json(['message' => 'Session signed out.']);
    }

    public function revokeOtherSessions(RevokeOtherSessionsRequest $request, SecurityAuditLogger $audit): JsonResponse
    {
        $deleted = DB::table(config('session.table'))
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();
        $this->rotateRememberToken($request->user());
        $request->session()->regenerate();
        $audit->record('OTHER_SESSIONS_REVOKED', $request->user()->id, $request, ['count' => $deleted]);

        return response()->json(['revoked' => $deleted]);
    }

    public function updatePassword(ChangePasswordRequest $request, SecurityAuditLogger $audit): JsonResponse
    {
        $this->replacePassword($request, $request->validated('password'), $audit);

        return response()->json(['message' => 'Password updated. Other sessions were signed out.']);
    }

    /**
     * The admin console changes the password without the current one, so the admin is emailed about every change.
     * A failed email is reported but doesn't undo or fail the change.
     */
    public function updateAdminPassword(ChangeOwnPasswordRequest $request, SecurityAuditLogger $audit): JsonResponse
    {
        $user = $request->user();
        $this->replacePassword($request, $request->validated('password'), $audit);

        try {
            $user->notify(new AdminPasswordChanged(now(), $request->ip(), $this->deviceName((string) $request->userAgent())));
        } catch (Throwable $exception) {
            report($exception);
        }

        return response()->json(['message' => 'Password updated. Other devices were signed out.']);
    }

    private function replacePassword(Request $request, string $password, SecurityAuditLogger $audit): void
    {
        $user = $request->user();
        $user->forceFill(['password' => $password])->save();
        DB::table(config('session.table'))->where('user_id', $user->id)->where('id', '!=', $request->session()->getId())->delete();
        $this->rotateRememberToken($user);
        $request->session()->regenerate();
        $audit->record('PASSWORD_CHANGED', $user->id, $request);
    }

    private function deviceName(string $agent): string
    {
        if (str_contains($agent, 'iPhone')) {
            return 'iPhone';
        }
        if (str_contains($agent, 'iPad')) {
            return 'iPad';
        }
        if (str_contains($agent, 'Android')) {
            return 'Android device';
        }
        if (str_contains($agent, 'Macintosh')) {
            return 'Mac';
        }
        if (str_contains($agent, 'Windows')) {
            return 'Windows PC';
        }
        if (str_contains($agent, 'Linux')) {
            return 'Linux device';
        }

        return 'Unknown device';
    }

    private function rotateRememberToken(User $user): void
    {
        $user->forceFill(['remember_token' => Str::random(60)])->save();
    }
}
