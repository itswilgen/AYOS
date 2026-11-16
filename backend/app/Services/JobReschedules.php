<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Moving a scheduled visit to a new time. Either side asks (with an optional reason); the other side accepts
 * or declines, and the asker can withdraw. The old time stands until a request is accepted. Allowed only while
 * the job is "scheduled", that is until the provider starts the work.
 */
class JobReschedules
{
    public const SIDES = ['customer', 'provider'];

    public function __construct(
        private readonly ProviderWorkspace $workspace,
        private readonly Conversations $conversations,
    ) {}

    /**
     * Opens a request to move the visit. $job must already belong to the caller's side (checked by the controller).
     */
    public function propose(int $jobId, string $side, int $userId, string $proposedAt, ?string $reason): void
    {
        DB::transaction(function () use ($jobId, $side, $userId, $proposedAt, $reason): void {
            $job = DB::table('provider_jobs')->where('id', $jobId)->lockForUpdate()->first();
            abort_unless($job, 404);
            abort_unless($job->status === 'scheduled', 409, 'Only a scheduled visit can be moved, before the work starts.');
            abort_if(DB::table('job_reschedule_requests')->where('provider_job_id', $jobId)->where('status', 'pending')->exists(),
                409, 'A new time is already waiting for an answer.');
            $when = CarbonImmutable::parse($proposedAt)->utc();
            abort_if($job->scheduled_at && $when->equalTo(CarbonImmutable::parse($job->scheduled_at)->utc()), 422, 'That is already the visit time.');

            DB::table('job_reschedule_requests')->insert([
                'provider_job_id' => $jobId, 'requested_by' => $side, 'requested_by_user_id' => $userId,
                'previous_at' => $job->scheduled_at, 'proposed_at' => $when, 'reason' => $reason ? trim($reason) : null,
                'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($side === 'customer') {
                $this->workspace->notify((int) $job->provider_profile_id, 'New visit time requested', 'A customer asked to move a scheduled visit.', '/provider/jobs/'.$jobId);
            } else {
                $this->workspace->notifyCustomer((int) $job->customer_id, 'New visit time requested', 'Your provider asked to move the visit. Accept or decline in My requests.',
                    '/my-requests#request-'.$job->service_request_id);
            }
            $this->conversations->note((int) $job->customer_id, (int) $job->provider_profile_id,
                'Request #'.$job->service_request_id.': '.($side === 'customer' ? 'the customer' : 'the provider').' asked to move the visit to '.$this->manila($when).'.');
        });
    }

    /**
     * Answers the open request: "accept" or "decline" by the other side, "withdraw" by the asker.
     * Returns true when the visit time changed.
     */
    public function answer(int $jobId, string $side, string $answer): bool
    {
        return DB::transaction(function () use ($jobId, $side, $answer): bool {
            $job = DB::table('provider_jobs')->where('id', $jobId)->lockForUpdate()->first();
            abort_unless($job, 404);
            $open = DB::table('job_reschedule_requests')->where('provider_job_id', $jobId)->where('status', 'pending')->first();
            abort_unless($open, 409, 'There is no new time waiting for an answer.');
            $mine = $open->requested_by === $side;
            abort_if($answer === 'withdraw' && ! $mine, 403, 'Only the person who asked can withdraw it.');
            abort_if($answer !== 'withdraw' && $mine, 403, 'The other side answers this request.');
            abort_unless($job->status === 'scheduled', 409, 'This visit can no longer be moved.');

            $status = ['accept' => 'accepted', 'decline' => 'declined', 'withdraw' => 'withdrawn'][$answer];
            DB::table('job_reschedule_requests')->where('id', $open->id)->update(['status' => $status, 'responded_at' => now(), 'updated_at' => now()]);
            $moved = $answer === 'accept';
            if ($moved) {
                DB::table('provider_jobs')->where('id', $jobId)->update(['scheduled_at' => $open->proposed_at, 'updated_at' => now()]);
            }

            $when = $this->manila(CarbonImmutable::parse($open->proposed_at));
            $title = ['accept' => 'New visit time agreed', 'decline' => 'New visit time declined', 'withdraw' => 'Time change withdrawn'][$answer];
            $detail = ['accept' => "The visit moved to {$when}.", 'decline' => 'The visit stays at the original time.', 'withdraw' => 'The visit stays at the original time.'][$answer];
            // Tell the other person: the asker hears the answer; on a withdrawal the one who was asked hears it.
            $tellCustomer = $answer === 'withdraw' ? $open->requested_by === 'provider' : $open->requested_by === 'customer';
            $tellCustomer
                ? $this->workspace->notifyCustomer((int) $job->customer_id, $title, $detail, '/my-requests#request-'.$job->service_request_id)
                : $this->workspace->notify((int) $job->provider_profile_id, $title, $detail, '/provider/jobs/'.$jobId);
            $this->conversations->note((int) $job->customer_id, (int) $job->provider_profile_id, 'Request #'.$job->service_request_id.': '.lcfirst($title).'. '.$detail);

            return $moved;
        });
    }

    /** Closes an open request when the job moves on (work started, or the booking was cancelled). Call inside the job's transaction. */
    public function closeOpen(int $jobId): void
    {
        DB::table('job_reschedule_requests')->where('provider_job_id', $jobId)->where('status', 'pending')
            ->update(['status' => 'cancelled', 'responded_at' => now(), 'updated_at' => now()]);
    }

    /** @return array{requestedBy: string, proposedAt: string, previousAt: ?string, reason: ?string}|null */
    public function openFor(int $jobId): ?array
    {
        $open = DB::table('job_reschedule_requests')->where('provider_job_id', $jobId)->where('status', 'pending')->first();

        return $open ? ['requestedBy' => $open->requested_by, 'proposedAt' => $open->proposed_at, 'previousAt' => $open->previous_at, 'reason' => $open->reason] : null;
    }

    private function manila(CarbonImmutable $when): string
    {
        return $when->setTimezone('Asia/Manila')->format('D, M j \a\t g:i A');
    }
}
