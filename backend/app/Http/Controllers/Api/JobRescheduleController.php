<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\JobReschedules;
use App\Services\ProviderWorkspace;
use App\Services\ServiceEmails;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Both sides of "move the visit": the customer under /customer/jobs/{id}/reschedule and the provider under
 * /provider/jobs/{id}/reschedule. Each route first proves the job belongs to the caller, then JobReschedules applies the rules.
 */
class JobRescheduleController extends Controller
{
    public function __construct(private JobReschedules $reschedules, private ProviderWorkspace $workspace, private ServiceEmails $emails) {}

    public function customerPropose(Request $request, int $jobId): JsonResponse
    {
        $this->ownCustomerJob($request, $jobId);
        $data = $this->validated($request);
        $this->reschedules->propose($jobId, 'customer', $request->user()->id, $data['proposedAt'], $data['reason'] ?? null);

        return response()->json(['status' => 'requested'], 201);
    }

    public function customerAnswer(Request $request, int $jobId, string $answer): JsonResponse
    {
        $this->ownCustomerJob($request, $jobId);
        $this->finish($jobId, 'customer', $answer);

        return response()->json(['status' => 'answered']);
    }

    public function providerPropose(Request $request, int $jobId): JsonResponse
    {
        $this->ownProviderJob($request, $jobId);
        $data = $this->validated($request);
        $this->reschedules->propose($jobId, 'provider', $request->user()->id, $data['proposedAt'], $data['reason'] ?? null);

        return response()->json($this->workspace->data($request->user()->id), 201);
    }

    public function providerAnswer(Request $request, int $jobId, string $answer): JsonResponse
    {
        $this->ownProviderJob($request, $jobId);
        $this->finish($jobId, 'provider', $answer);

        return response()->json($this->workspace->data($request->user()->id));
    }

    private function finish(int $jobId, string $side, string $answer): void
    {
        abort_unless(in_array($answer, ['accept', 'decline', 'withdraw'], true), 404);
        if ($this->reschedules->answer($jobId, $side, $answer)) {
            // The customer gets the same "Visit scheduled" email, now with the new time.
            $this->emails->visitScheduled($jobId);
        }
    }

    /** @return array{proposedAt: string, reason?: string|null} */
    private function validated(Request $request): array
    {
        return $request->validate([
            'proposedAt' => ['required', 'date', 'after:now'],
            'reason' => ['nullable', 'string', 'max:240'],
        ]);
    }

    private function ownCustomerJob(Request $request, int $jobId): void
    {
        abort_unless(DB::table('provider_jobs')->where('id', $jobId)->where('customer_id', $request->user()->id)->exists(), 404);
    }

    private function ownProviderJob(Request $request, int $jobId): void
    {
        $profile = $this->workspace->approved($request->user()->id);
        abort_unless(DB::table('provider_jobs')->where('id', $jobId)->where('provider_profile_id', $profile->id)->exists(), 404);
    }
}
