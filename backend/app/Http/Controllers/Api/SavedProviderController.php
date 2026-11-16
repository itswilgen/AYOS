<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProviderDirectory;
use App\Services\ProviderWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * A customer's saved providers: a short list of people they trust, to book again later.
 * Saving and removing are idempotent, so a double tap never errors.
 */
class SavedProviderController extends Controller
{
    /** Enough for a real "my providers" list, small enough that it never becomes a second search. */
    public const LIMIT = 50;

    public function __construct(private ProviderDirectory $directory, private ProviderWorkspace $workspace) {}

    public function index(Request $request): JsonResponse
    {
        $rows = DB::table('saved_providers as sp')->join('provider_profiles as p', 'p.id', '=', 'sp.provider_profile_id')
            ->where('sp.user_id', $request->user()->id)->where('p.status', 'approved')->orderByDesc('sp.created_at')->orderByDesc('sp.id')
            ->get(['p.id', 'p.display_name', 'p.bio', 'p.years_experience', 'p.photo_path', 'p.verified', 'p.status', 'p.accepting_requests', 'p.access_kind', 'sp.created_at as saved_at']);
        $summaries = $this->directory->summaries($rows)->keyBy('id');

        return response()->json(['data' => $rows->map(fn (object $row): array => [
            ...$summaries->get((string) $row->id),
            // Saved providers stay listed while paused, so the customer knows why "Request" is not offered.
            'acceptingRequests' => $this->workspace->canReceive($row),
            'savedAt' => $row->saved_at,
        ])->values()]);
    }

    public function store(Request $request, int $providerId): JsonResponse
    {
        $provider = DB::table('provider_profiles')->where('id', $providerId)->where('status', 'approved')->first();
        abort_unless($provider, 404);
        $userId = $request->user()->id;
        abort_if($provider->user_id === $userId, 422, 'You cannot save your own provider profile.');
        $exists = DB::table('saved_providers')->where('user_id', $userId)->where('provider_profile_id', $providerId)->exists();
        if (! $exists) {
            abort_if(DB::table('saved_providers')->where('user_id', $userId)->count() >= self::LIMIT, 422,
                'You can save up to '.self::LIMIT.' providers. Remove one to save another.');
            DB::table('saved_providers')->insertOrIgnore(['user_id' => $userId, 'provider_profile_id' => $providerId, 'created_at' => now(), 'updated_at' => now()]);
        }

        return response()->json(['saved' => true]);
    }

    public function destroy(Request $request, int $providerId): JsonResponse
    {
        DB::table('saved_providers')->where('user_id', $request->user()->id)->where('provider_profile_id', $providerId)->delete();

        return response()->json(['saved' => false]);
    }
}
