<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * What customers may discover: approved providers who accept requests, their visible and active services,
 * and only while a trial provider is still inside the free client quota.
 */
class ProviderDirectory
{
    /** Home-row slots kept for providers without completed jobs, so new providers still get seen. */
    private const NEWCOMER_SLOTS = 2;

    private const REVIEWS_PAGE = 5;

    private const PORTFOLIO_LIMIT = 24;

    /** Completed-job counts that earn a milestone badge. */
    private const JOB_MILESTONES = [5, 10, 25, 50, 100, 250, 500];

    public function __construct(private PlatformSettings $settings) {}

    /**
     * @param  array<int, int>  $providerIds
     * @return array{reviews: Collection<int, object>, completed: Collection<int, object>}
     */
    public function stats(array $providerIds): array
    {
        return [
            'reviews' => DB::table('provider_reviews')->whereIn('provider_profile_id', $providerIds)
                ->selectRaw('provider_profile_id, AVG(rating) as average, COUNT(*) as total')->groupBy('provider_profile_id')->get()->keyBy('provider_profile_id'),
            'completed' => DB::table('provider_jobs')->whereIn('provider_profile_id', $providerIds)->where('status', 'completed')
                ->selectRaw('provider_profile_id, COUNT(*) as total, COUNT(DISTINCT customer_id) as clients')->groupBy('provider_profile_id')->get()->keyBy('provider_profile_id'),
        ];
    }

    /**
     * @param  Collection<int, object>  $completed
     */
    public function withinFreeQuota(int $providerId, string $accessKind, Collection $completed): bool
    {
        return $accessKind === 'lifetime'
            || (int) ($completed->get($providerId)?->clients ?? 0) < $this->settings->get('free_successful_client_quota', 10);
    }

    /**
     * Approved service covers for the customer Home page: one per provider, proven providers first,
     * with a few slots for newcomers.
     *
     * @return list<array{id: string, providerId: string, providerName: string, category: string, categorySlug: string, description: string,
     *     cover: array{image: string, fit: string, focusX: int, focusY: int}, rating: float|null, reviewCount: int, completedServices: int,
     *     verified: bool, areaLabel: string}>
     */
    public function featuredServices(?string $cityCode, int $limit = 8): array
    {
        $rows = DB::table('provider_services as s')
            ->join('provider_profiles as p', 'p.id', '=', 's.provider_profile_id')
            ->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->where('s.cover_status', 'approved')->where('s.active', true)->where('s.is_visible', true)
            ->where('p.status', 'approved')->where('p.accepting_requests', true)
            ->whereExists(fn (Builder $areas) => $areas->selectRaw('1')->from('provider_service_areas as a')
                ->whereColumn('a.provider_profile_id', 'p.id')->where('a.active', true)
                ->when($cityCode, fn (Builder $query) => $query->where('a.city_municipality_code', $cityCode)))
            ->orderByDesc('s.cover_reviewed_at')->orderByDesc('s.id')->limit(200)
            ->get(['s.id', 's.provider_profile_id', 's.description', 's.cover_path', 's.cover_fit', 's.cover_focus_x', 's.cover_focus_y',
                'c.name as category', 'c.slug as category_slug', 'p.display_name', 'p.verified', 'p.access_kind']);

        $providerIds = $rows->pluck('provider_profile_id')->unique()->values()->all();
        ['reviews' => $reviews, 'completed' => $completed] = $this->stats($providerIds);
        $areas = $this->areaLabels($providerIds, $cityCode);

        $items = $rows->filter(fn (object $row): bool => $this->withinFreeQuota((int) $row->provider_profile_id, $row->access_kind, $completed))
            ->unique('provider_profile_id')
            ->map(fn (object $row): array => [
                'id' => (string) $row->id, 'providerId' => (string) $row->provider_profile_id, 'providerName' => $row->display_name,
                'category' => $row->category, 'categorySlug' => $row->category_slug, 'description' => $row->description,
                'cover' => ['image' => Storage::disk('public')->url($row->cover_path), 'fit' => $row->cover_fit,
                    'focusX' => (int) $row->cover_focus_x, 'focusY' => (int) $row->cover_focus_y],
                'rating' => $reviews->has($row->provider_profile_id) ? round((float) $reviews->get($row->provider_profile_id)->average, 1) : null,
                'reviewCount' => (int) ($reviews->get($row->provider_profile_id)?->total ?? 0),
                'completedServices' => (int) ($completed->get($row->provider_profile_id)?->total ?? 0),
                'verified' => (bool) $row->verified, 'areaLabel' => $areas[$row->provider_profile_id] ?? '',
            ])->values();

        [$established, $newcomers] = $items->partition(fn (array $item): bool => $item['completedServices'] > 0);
        $established = $established->sortBy([['completedServices', 'desc'], ['rating', 'desc']])->values();
        $newcomers = $newcomers->values();
        $provenSlots = $limit - self::NEWCOMER_SLOTS;

        return $established->take($provenSlots)->concat($newcomers->take(self::NEWCOMER_SLOTS))
            ->concat($established->slice($provenSlots))->concat($newcomers->slice(self::NEWCOMER_SLOTS))
            ->take($limit)->values()->all();
    }

    /**
     * A provider's public profile. Paused providers stay viewable so customers can follow up on past work,
     * but `acceptingRequests` tells the page whether new requests and messages are possible.
     * Never includes the provider's account id, email or phone.
     *
     * @return array<string, mixed>|null
     */
    public function profile(int $providerId, bool $acceptingRequests): ?array
    {
        $profile = DB::table('provider_profiles')->where('id', $providerId)->where('status', 'approved')
            ->first(['id', 'display_name', 'bio', 'years_experience', 'photo_path', 'verified', 'approved_at']);
        if (! $profile) {
            return null;
        }
        $services = DB::table('provider_services as s')->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->where('s.provider_profile_id', $providerId)->where('s.active', true)->where('s.is_visible', true)->orderBy('c.name')
            ->get(['s.id', 's.service_category_id', 's.description', 's.cover_path', 's.cover_status', 's.cover_fit', 's.cover_focus_x', 's.cover_focus_y', 'c.name', 'c.slug']);
        if ($services->isEmpty()) {
            return null;
        }
        ['reviews' => $reviews, 'completed' => $completed] = $this->stats([$providerId]);
        $rating = $reviews->has($providerId) ? round((float) $reviews->get($providerId)->average, 1) : null;
        $reviewCount = (int) ($reviews->get($providerId)?->total ?? 0);
        $completedServices = (int) ($completed->get($providerId)?->total ?? 0);
        $jobsByCategory = DB::table('provider_jobs as j')->join('service_requests as r', 'r.id', '=', 'j.service_request_id')
            ->where('j.provider_profile_id', $providerId)->where('j.status', 'completed')
            ->selectRaw('r.service_category_id, COUNT(*) as total')->groupBy('r.service_category_id')->pluck('total', 'service_category_id');
        $repeatCustomers = DB::table('provider_jobs')->where('provider_profile_id', $providerId)->where('status', 'completed')
            ->select('customer_id')->groupBy('customer_id')->havingRaw('COUNT(*) > 1')->get()->count();
        $breakdown = DB::table('provider_reviews')->where('provider_profile_id', $providerId)
            ->selectRaw('rating, COUNT(*) as total')->groupBy('rating')->pluck('total', 'rating');

        return [
            'id' => (string) $profile->id, 'displayName' => $profile->display_name, 'bio' => $profile->bio,
            'yearsExperience' => (int) $profile->years_experience, 'verified' => (bool) $profile->verified,
            'photo' => $profile->photo_path ? Storage::disk('public')->url($profile->photo_path) : null,
            'memberSince' => $profile->approved_at, 'acceptingRequests' => $acceptingRequests,
            'rating' => $rating,
            'reviewCount' => $reviewCount,
            'ratingBreakdown' => collect([5, 4, 3, 2, 1])->map(fn (int $stars): array => ['stars' => $stars, 'count' => (int) ($breakdown[$stars] ?? 0)])->all(),
            'completedServices' => $completedServices,
            'repeatCustomers' => $repeatCustomers,
            'achievements' => $this->achievements($rating, $reviewCount, $completedServices, $repeatCustomers, (int) $profile->years_experience),
            'areas' => DB::table('provider_service_areas as a')->join('city_municipalities as city', 'city.code', '=', 'a.city_municipality_code')
                ->leftJoin('barangays as b', 'b.code', '=', 'a.barangay_code')
                ->where('a.provider_profile_id', $providerId)->where('a.active', true)->orderBy('city.name')->get(['city.name as city', 'b.name as barangay'])
                ->map(fn (object $area): string => $area->barangay ? $area->barangay.', '.$area->city : $area->city)->unique()->values()->all(),
            'services' => $services->map(fn (object $s): array => [
                'id' => (string) $s->id, 'category' => $s->name, 'categorySlug' => $s->slug, 'description' => $s->description,
                'completedJobs' => (int) ($jobsByCategory[$s->service_category_id] ?? 0),
                'cover' => $s->cover_path && $s->cover_status === 'approved' ? ['image' => Storage::disk('public')->url($s->cover_path),
                    'fit' => $s->cover_fit, 'focusX' => (int) $s->cover_focus_x, 'focusY' => (int) $s->cover_focus_y] : null,
            ])->all(),
            'portfolio' => DB::table('provider_portfolio_items')->where('provider_profile_id', $providerId)->where('is_visible', true)
                ->orderByDesc('id')->limit(self::PORTFOLIO_LIMIT)->get()
                ->map(fn (object $item): array => ['id' => (string) $item->id, 'title' => $item->title, 'category' => $item->category,
                    'image' => Storage::disk('public')->url($item->image_path), 'date' => $item->created_at])->all(),
            'reviews' => $this->reviews($providerId),
        ];
    }

    /**
     * Newest reviews first, optionally only one star rating, continuing below `$beforeId` for "Show more".
     * Customers appear by first name only.
     *
     * @return array{data: list<array{id: string, rating: int, comment: string|null, service: string, date: string, customerName: string}>, hasMore: bool}
     */
    public function reviews(int $providerId, ?int $stars = null, ?int $beforeId = null): array
    {
        $rows = DB::table('provider_reviews as rv')->join('provider_jobs as j', 'j.id', '=', 'rv.provider_job_id')
            ->join('service_requests as r', 'r.id', '=', 'j.service_request_id')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->join('users as u', 'u.id', '=', 'rv.customer_id')
            ->where('rv.provider_profile_id', $providerId)
            ->when($stars, fn (Builder $query) => $query->where('rv.rating', $stars))
            ->when($beforeId, fn (Builder $query) => $query->where('rv.id', '<', $beforeId))
            ->orderByDesc('rv.id')->limit(self::REVIEWS_PAGE + 1)
            ->get(['rv.id', 'rv.rating', 'rv.comment', 'rv.created_at', 'c.name as service', 'u.name as customer_name']);

        return [
            'data' => $rows->take(self::REVIEWS_PAGE)->map(fn (object $r): array => ['id' => (string) $r->id, 'rating' => (int) $r->rating,
                'comment' => $r->comment ?: null, 'service' => $r->service, 'date' => $r->created_at,
                'customerName' => explode(' ', trim($r->customer_name ?: 'Customer'))[0]])->values()->all(),
            'hasMore' => $rows->count() > self::REVIEWS_PAGE,
        ];
    }

    /**
     * Badges a provider has earned from confirmed work. Only earned badges are returned, so new providers show none.
     *
     * @return list<array{key: string, title: string, detail: string}>
     */
    private function achievements(?float $rating, int $reviewCount, int $completed, int $repeatCustomers, int $years): array
    {
        $milestone = collect(self::JOB_MILESTONES)->filter(fn (int $step): bool => $completed >= $step)->last();

        return array_values(array_filter([
            $rating !== null && $rating >= 4.5 && $reviewCount >= 3
                ? ['key' => 'top_rated', 'title' => 'Top rated', 'detail' => number_format($rating, 1).' average from '.$reviewCount.' reviews'] : null,
            $milestone
                ? ['key' => 'jobs_milestone', 'title' => $milestone.'+ jobs completed', 'detail' => 'Each one confirmed by the customer on AYOS'] : null,
            $repeatCustomers >= 2
                ? ['key' => 'repeat_customers', 'title' => 'Customers come back', 'detail' => $repeatCustomers.' customers booked again'] : null,
            $years >= 5
                ? ['key' => 'experienced', 'title' => 'Seasoned pro', 'detail' => $years.' years in the trade'] : null,
        ]));
    }

    /**
     * @param  array<int, int>  $providerIds
     * @return array<int, string>
     */
    private function areaLabels(array $providerIds, ?string $cityCode): array
    {
        return DB::table('provider_service_areas as a')->join('city_municipalities as city', 'city.code', '=', 'a.city_municipality_code')
            ->whereIn('a.provider_profile_id', $providerIds)->where('a.active', true)
            ->when($cityCode, fn (Builder $query) => $query->where('a.city_municipality_code', $cityCode))
            ->orderBy('city.name')->get(['a.provider_profile_id', 'city.name'])
            ->groupBy('provider_profile_id')->map(fn (Collection $cities): string => $cities->first()->name)->all();
    }
}
