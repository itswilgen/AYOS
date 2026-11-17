<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The two engagement numbers AYOS is judged by (Phase 2 gate): do customers book the same provider again, and how
 * fast do providers accept requests. Each covers the last 30 days and is compared with the 30 days before.
 * With too little data a number is still shown, but no trend is claimed.
 */
class GateStats
{
    public const DAYS = 30;

    /** Below this many requests (or acceptances) in either period, a trend would be noise. */
    public const MIN_SAMPLE = 5;

    /**
     * @return array{days: int, minSample: int, repeatBookings: array<string, mixed>, acceptSpeed: array<string, mixed>}
     */
    public function summary(?Carbon $now = null): array
    {
        $now ??= now();
        $start = $now->copy()->subDays(self::DAYS);
        $before = $start->copy()->subDays(self::DAYS);

        $repeatNow = $this->repeatBookings($start, $now);
        $repeatBefore = $this->repeatBookings($before, $start);
        $acceptNow = $this->acceptMinutes($start, $now);
        $acceptBefore = $this->acceptMinutes($before, $start);

        return [
            'days' => self::DAYS,
            'minSample' => self::MIN_SAMPLE,
            'repeatBookings' => [
                ...$repeatNow,
                'previousRate' => $repeatBefore['rate'],
                // More repeat bookings is better.
                'trend' => $this->trend($repeatNow['requests'], $repeatBefore['requests'], $repeatNow['rate'], $repeatBefore['rate'], higherIsBetter: true),
            ],
            'acceptSpeed' => [
                'accepted' => $acceptNow['count'],
                'medianMinutes' => $acceptNow['median'],
                'previousMedianMinutes' => $acceptBefore['median'],
                // Requests nobody has answered yet: a slow provider shows up here before it shows in the median.
                'waiting' => DB::table('service_requests')->where('status', 'new')->count(),
                'trend' => $this->trend($acceptNow['count'], $acceptBefore['count'], $acceptNow['median'], $acceptBefore['median'], higherIsBetter: false),
            ],
        ];
    }

    /**
     * Requests sent in the period, and how many were repeat bookings (the server links a request to the customer's
     * last finished job with the same provider; the browser can't set it).
     *
     * @return array{requests: int, repeats: int, rate: float|null}
     */
    private function repeatBookings(Carbon $from, Carbon $to): array
    {
        $row = DB::table('service_requests')->where('created_at', '>=', $from)->where('created_at', '<', $to)
            ->selectRaw('COUNT(*) as total, COUNT(repeat_of_request_id) as repeats')->first();
        $total = (int) $row->total;

        return ['requests' => $total, 'repeats' => (int) $row->repeats, 'rate' => $total ? round($row->repeats / $total * 100, 1) : null];
    }

    /**
     * Minutes from "request sent" to "accepted" for requests accepted in the period. Accepting creates the job in the
     * same step, so the job's creation time is the accept time. The median keeps one slow weekend from hiding a fast month.
     *
     * @return array{count: int, median: int|null}
     */
    private function acceptMinutes(Carbon $from, Carbon $to): array
    {
        $minutes = DB::table('provider_jobs as j')->join('service_requests as r', 'r.id', '=', 'j.service_request_id')
            ->where('j.created_at', '>=', $from)->where('j.created_at', '<', $to)
            ->get(['r.created_at as sent', 'j.created_at as accepted'])
            ->map(fn (object $row): float => max(0, Carbon::parse($row->sent)->diffInSeconds(Carbon::parse($row->accepted)) / 60))
            ->sort()->values();

        return ['count' => $minutes->count(), 'median' => $minutes->isEmpty() ? null : (int) round($minutes->median())];
    }

    /**
     * 'better', 'worse' or 'same' against the period before, or null when either period has too little data.
     */
    private function trend(int $sampleNow, int $sampleBefore, ?float $now, ?float $before, bool $higherIsBetter): ?string
    {
        if ($sampleNow < self::MIN_SAMPLE || $sampleBefore < self::MIN_SAMPLE || $now === null || $before === null) {
            return null;
        }
        if ($now == $before) {
            return 'same';
        }

        return ($now > $before) === $higherIsBetter ? 'better' : 'worse';
    }
}
