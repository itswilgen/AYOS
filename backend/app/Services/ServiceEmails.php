<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\ServiceUpdate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Email updates for the request and job flow, next to the in-app notifications:
 * the provider hears about a new request; the customer hears when it is accepted, declined, scheduled or finished.
 *
 * Emails are sent only after the surrounding transaction commits, so a rolled-back change never sends one,
 * and a mail failure is reported without failing the customer's or provider's action.
 * Before a provider accepts, emails name only the broad area (barangay and city), never the street.
 */
class ServiceEmails
{
    public function newRequest(int $requestId): void
    {
        $request = $this->request($requestId);
        if (! $request) {
            return;
        }

        $this->send($request->provider_user_id, new ServiceUpdate(
            'New request: '.$request->service,
            [
                "A customer in {$request->area} needs {$request->service}.",
                'Preferred time: '.$this->manila($request->preferred_at).'.',
                'Open the request to see the details and accept or decline it.',
            ],
            'View the request',
            '/provider/requests/'.$requestId,
        ));
    }

    public function requestAccepted(int $requestId): void
    {
        $request = $this->request($requestId);
        if (! $request) {
            return;
        }

        $this->send($request->customer_id, new ServiceUpdate(
            "{$request->provider} accepted your request",
            [
                "{$request->provider} accepted your request for {$request->service}.",
                'They will confirm a visit time with you. You can now share contact details in Messages.',
            ],
            'Open My requests',
            '/my-requests',
        ));
    }

    public function requestDeclined(int $requestId): void
    {
        $request = $this->request($requestId);
        if (! $request) {
            return;
        }

        $this->send($request->customer_id, new ServiceUpdate(
            'Your request for '.$request->service.' was declined',
            [
                "{$request->provider} can't take your request for {$request->service} right now.",
                'You can send the same request to another provider who serves your area.',
            ],
            'Find another provider',
            '/home#services',
        ));
    }

    public function visitScheduled(int $jobId): void
    {
        $job = $this->job($jobId);
        if (! $job || ! $job->scheduled_at) {
            return;
        }

        $this->send($job->customer_id, new ServiceUpdate(
            'Visit scheduled: '.$job->service,
            [
                "{$job->provider} scheduled the visit for {$job->service}.",
                'When: '.$this->manila($job->scheduled_at).'.',
            ],
            'Open My requests',
            '/my-requests',
        ));
    }

    public function workFinished(int $jobId): void
    {
        $job = $this->job($jobId);
        if (! $job) {
            return;
        }

        $this->send($job->customer_id, new ServiceUpdate(
            'Please confirm the finished work',
            [
                "{$job->provider} marked the {$job->service} work as finished.",
                'Check the work, then confirm it in My requests. You can leave a review after confirming.',
            ],
            'Confirm the work',
            '/my-requests',
        ));
    }

    private function send(?int $userId, ServiceUpdate $notification): void
    {
        $user = $userId ? User::query()->find($userId) : null;
        if (! $user || ! $user->email) {
            return;
        }

        DB::afterCommit(function () use ($user, $notification): void {
            try {
                $user->notify($notification);
            } catch (Throwable $exception) {
                report($exception);
            }
        });
    }

    /** A request with the names an email needs, and only the broad area of its address. */
    private function request(int $requestId): ?object
    {
        return DB::table('service_requests as r')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->join('provider_profiles as p', 'p.id', '=', 'r.provider_profile_id')
            ->join('service_locations as l', 'l.id', '=', 'r.service_location_id')
            ->join('city_municipalities as city', 'city.code', '=', 'l.city_municipality_code')
            ->leftJoin('barangays as b', 'b.code', '=', 'l.barangay_code')
            ->where('r.id', $requestId)
            ->first([
                'r.customer_id', 'r.preferred_at', 'c.name as service', 'p.display_name as provider', 'p.user_id as provider_user_id',
                DB::raw("COALESCE(b.name || ', ' || city.name, city.name) as area"),
            ]);
    }

    private function job(int $jobId): ?object
    {
        return DB::table('provider_jobs as j')
            ->join('service_requests as r', 'r.id', '=', 'j.service_request_id')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->join('provider_profiles as p', 'p.id', '=', 'j.provider_profile_id')
            ->where('j.id', $jobId)
            ->first(['j.customer_id', 'j.scheduled_at', 'c.name as service', 'p.display_name as provider']);
    }

    private function manila(string $timestamp): string
    {
        return CarbonImmutable::parse($timestamp)->setTimezone('Asia/Manila')->format('l, F j \a\t g:i A');
    }
}
