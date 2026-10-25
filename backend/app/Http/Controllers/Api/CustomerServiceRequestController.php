<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Conversations;
use App\Services\PlatformSettings;
use App\Services\ProviderDirectory;
use App\Services\ProviderWorkspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class CustomerServiceRequestController extends Controller
{
    public function __construct(private ProviderWorkspace $workspace, private PlatformSettings $settings, private ProviderDirectory $directory, private Conversations $conversations) {}

    public function providers(Request $request): JsonResponse
    {
        abort_unless($this->settings->get('customer_requests_enabled', true), 503, 'Customer requests are temporarily unavailable.');
        $data = $request->validate(['category' => ['nullable', 'string', Rule::exists('service_categories', 'slug')],
            'cityCode' => ['nullable', 'string', Rule::exists('city_municipalities', 'code')], 'q' => ['nullable', 'string', 'max:80'],
            'providerId' => ['nullable', 'integer', Rule::exists('provider_profiles', 'id')]]);
        $query = DB::table('provider_profiles as p')->join('provider_services as s', 's.provider_profile_id', '=', 'p.id')
            ->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->join('provider_service_areas as a', 'a.provider_profile_id', '=', 'p.id')
            ->where('p.status', 'approved')->where('p.accepting_requests', true)->where('s.active', true)->where('s.is_visible', true)->where('a.active', true)
            ->select('p.id', 'p.display_name', 'p.bio', 'p.years_experience', 'p.photo_path', 'p.verified', 'p.access_kind')->distinct();
        if (isset($data['category'])) {
            $query->where('c.slug', $data['category']);
        }
        if (isset($data['cityCode'])) {
            $query->where('a.city_municipality_code', $data['cityCode']);
        }
        if (isset($data['providerId'])) {
            $query->where('p.id', $data['providerId']);
        }
        if (filled($data['q'] ?? null)) {
            $query->where(fn ($q) => $q->whereRaw('LOWER(c.name) LIKE ?', ['%'.mb_strtolower($data['q']).'%'])->orWhereRaw('LOWER(p.display_name) LIKE ?', ['%'.mb_strtolower($data['q']).'%']));
        }
        $providers = $query->limit(100)->get();
        $ids = $providers->pluck('id')->all();
        $services = DB::table('provider_services as s')->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->whereIn('s.provider_profile_id', $ids)->where('s.active', true)->where('s.is_visible', true)->orderBy('c.name')
            ->get(['s.provider_profile_id', 'c.name'])->groupBy('provider_profile_id');
        $areas = DB::table('provider_service_areas as a')->join('city_municipalities as city', 'city.code', '=', 'a.city_municipality_code')
            ->whereIn('a.provider_profile_id', $ids)->where('a.active', true)->orderBy('city.name')
            ->get(['a.provider_profile_id', 'city.name'])->groupBy('provider_profile_id');
        ['reviews' => $reviews, 'completed' => $completed] = $this->directory->stats($ids);
        $providers = $providers->filter(fn ($p) => $this->directory->withinFreeQuota((int) $p->id, $p->access_kind, $completed));

        return response()->json(['data' => $providers->map(function ($p) use ($services, $areas, $reviews, $completed) {
            return ['id' => (string) $p->id, 'displayName' => $p->display_name, 'bio' => $p->bio,
                'yearsExperience' => $p->years_experience, 'photo' => $p->photo_path ? Storage::disk('public')->url($p->photo_path) : null,
                'specialties' => ($services->get($p->id) ?? collect())->pluck('name')->all(),
                'serviceAreaLabel' => $areas->get($p->id)?->first()?->name ?? '',
                'rating' => $reviews->get($p->id)?->average,
                'reviewCount' => (int) ($reviews->get($p->id)?->total ?? 0),
                'completedServices' => (int) ($completed->get($p->id)?->total ?? 0),
                'verified' => (bool) $p->verified];
        })->values()]);
    }

    /**
     * A provider's public profile. `isOwnProfile` lets the owner preview it without offering to message or book themselves.
     */
    public function profile(Request $request, int $providerId): JsonResponse
    {
        abort_unless($this->settings->get('customer_requests_enabled', true), 503, 'Customer requests are temporarily unavailable.');
        $provider = DB::table('provider_profiles')->where('id', $providerId)->first();
        $profile = $provider ? $this->directory->profile($providerId, $this->workspace->canReceive($provider)) : null;
        abort_unless($profile, 404);

        return response()->json(['data' => [...$profile, 'isOwnProfile' => $request->user('sanctum')?->id === $provider->user_id]]);
    }

    /**
     * More of a provider's reviews for the profile page, filtered by star rating and continued with `before`.
     */
    public function reviews(Request $request, int $providerId): JsonResponse
    {
        abort_unless($this->settings->get('customer_requests_enabled', true), 503, 'Customer requests are temporarily unavailable.');
        abort_unless(DB::table('provider_profiles')->where('id', $providerId)->where('status', 'approved')->exists(), 404);
        $data = $request->validate(['rating' => ['nullable', 'integer', 'between:1,5'], 'before' => ['nullable', 'integer', 'min:1']]);

        return response()->json($this->directory->reviews($providerId, $data['rating'] ?? null, $data['before'] ?? null));
    }

    /**
     * Approved service covers for the customer Home page, limited to providers serving the given city.
     */
    public function featuredServices(Request $request): JsonResponse
    {
        abort_unless($this->settings->get('customer_requests_enabled', true), 503, 'Customer requests are temporarily unavailable.');
        $data = $request->validate(['cityCode' => ['nullable', 'string', Rule::exists('city_municipalities', 'code')]]);

        return response()->json(['data' => $this->directory->featuredServices($data['cityCode'] ?? null)]);
    }

    public function index(Request $request): JsonResponse
    {
        $items = DB::table('service_requests as r')->join('provider_profiles as p', 'p.id', '=', 'r.provider_profile_id')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->leftJoin('provider_jobs as j', 'j.service_request_id', '=', 'r.id')
            ->leftJoin('provider_reviews as rv', 'rv.provider_job_id', '=', 'j.id')
            ->where('r.customer_id', $request->user()->id)->orderByDesc('r.created_at')
            ->get(['r.id', 'r.description', 'r.preferred_at', 'r.status as request_status', 'r.created_at',
                'p.id as provider_id', 'p.display_name as provider_name', 'c.name as service', 'j.id as job_id', 'j.status as job_status', 'rv.id as review_id']);

        return response()->json(['data' => $items]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $items = DB::table('customer_notifications')->where('customer_id', $request->user()->id)->orderByDesc('created_at')->orderByDesc('id')->limit(100)->get();

        return response()->json(['data' => $items->map(fn ($item) => [
            'id' => (string) $item->id, 'title' => $item->title, 'description' => $item->detail,
            'createdAtLabel' => $item->created_at, 'unread' => $item->read_at === null, 'href' => $item->href ?: '/my-requests',
        ])]);
    }

    public function readNotification(Request $request, int $notificationId): JsonResponse
    {
        abort_unless(DB::table('customer_notifications')->where('id', $notificationId)->where('customer_id', $request->user()->id)
            ->update(['read_at' => now(), 'updated_at' => now()]), 404);

        return $this->notifications($request);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($this->settings->get('customer_requests_enabled', true), 503, 'Customer requests are temporarily unavailable.');
        $data = $request->validate([
            'providerId' => ['required', 'integer', Rule::exists('provider_profiles', 'id')],
            'category' => ['required', 'string', Rule::exists('service_categories', 'slug')],
            'serviceLocationId' => ['required', 'integer', Rule::exists('service_locations', 'id')],
            'description' => ['required', 'string', 'min:10', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'preferredAt' => ['required', 'date', 'after:now'],
            'photos' => ['nullable', 'array', 'max:5'],
            'photos.*' => ['image', 'mimes:jpeg,png,webp', 'max:5120'],
        ]);
        $userId = $request->user()->id;
        $location = DB::table('service_locations')->where('id', $data['serviceLocationId'])->where('user_id', $userId)->first();
        abort_unless($location, 404);
        $category = DB::table('service_categories')->where('slug', $data['category'])->where('is_active', true)->first();
        abort_unless($category, 422, 'This service is currently unavailable.');
        $requestId = DB::transaction(function () use ($data, $location, $category, $userId): int {
            $provider = DB::table('provider_profiles')->where('id', $data['providerId'])->lockForUpdate()->first();
            abort_unless($provider && $provider->user_id !== $userId, 404);
            abort_unless($this->workspace->canReceive($provider), 409, 'This provider is not receiving requests.');
            abort_unless(DB::table('provider_services')->where('provider_profile_id', $provider->id)->where('service_category_id', $category->id)->where('active', true)->exists(), 422, 'This provider does not offer that service.');
            abort_unless(DB::table('provider_service_areas')->where('provider_profile_id', $provider->id)->where('city_municipality_code', $location->city_municipality_code)
                ->where('active', true)->where(fn ($q) => $q->whereNull('barangay_code')->orWhere('barangay_code', $location->barangay_code))->exists(), 422, 'This provider does not serve your selected location.');
            $id = DB::table('service_requests')->insertGetId([
                'customer_id' => $userId, 'provider_profile_id' => $provider->id, 'service_category_id' => $category->id,
                'service_location_id' => $location->id, 'description' => trim($data['description']), 'notes' => trim($data['notes'] ?? ''),
                'preferred_at' => $data['preferredAt'], 'status' => 'new', 'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->workspace->notify($provider->id, 'New customer request', 'A customer requested '.$category->name.'.', '/provider/requests/'.$id);
            $this->conversations->note($userId, $provider->id, 'Request #'.$id.' sent for '.$category->name.'.');

            return $id;
        });
        foreach ($data['photos'] ?? [] as $photo) {
            $path = $photo->store('service-requests/'.$requestId, 'local');
            DB::table('service_request_photos')->insert(['service_request_id' => $requestId, 'image_path' => $path, 'created_at' => now(), 'updated_at' => now()]);
        }

        return response()->json(['id' => $requestId, 'status' => 'new'], 201);
    }

    public function confirm(Request $request, int $jobId): JsonResponse
    {
        DB::transaction(function () use ($request, $jobId): void {
            $candidate = DB::table('provider_jobs')->where('id', $jobId)->where('customer_id', $request->user()->id)->first();
            abort_unless($candidate, 404);
            $profile = DB::table('provider_profiles')->where('id', $candidate->provider_profile_id)->lockForUpdate()->first();
            $job = DB::table('provider_jobs')->where('id', $jobId)->where('customer_id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($job->status === 'provider_finished', 409, 'The provider must finish the work before you can confirm it.');
            DB::table('provider_jobs')->where('id', $jobId)->update(['status' => 'completed', 'completed_at' => now(), 'updated_at' => now()]);
            $this->workspace->notify($job->provider_profile_id, 'Service completed', 'Your customer confirmed the completed service.', '/provider/jobs/'.$jobId);
            $this->conversations->note($job->customer_id, $job->provider_profile_id, 'Request #'.$job->service_request_id.' completed.');
            if ($profile->access_kind === 'trial' && $this->workspace->completedCount($profile->id) >= $this->settings->get('free_successful_client_quota', 10)) {
                DB::table('provider_profiles')->where('id', $profile->id)->update(['accepting_requests' => false, 'updated_at' => now()]);
                $this->workspace->notify($profile->id, 'Free client quota complete', 'New requests are paused until lifetime access is activated.', '/provider/access');
            }
        });

        return response()->json(['status' => 'completed']);
    }

    public function cancel(Request $request, int $jobId): JsonResponse
    {
        DB::transaction(function () use ($request, $jobId): void {
            $job = DB::table('provider_jobs')->where('id', $jobId)->where('customer_id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($job, 404);
            abort_unless(in_array($job->status, ['accepted', 'scheduled'], true), 409, 'This job can no longer be cancelled online.');
            DB::table('provider_jobs')->where('id', $jobId)->update(['status' => 'cancelled', 'updated_at' => now()]);
            $this->workspace->notify($job->provider_profile_id, 'Job cancelled', 'A customer cancelled a booked service.', '/provider/jobs/'.$jobId);
            $this->conversations->note($job->customer_id, $job->provider_profile_id, 'Request #'.$job->service_request_id.' cancelled by the customer.');
        });

        return response()->json(['status' => 'cancelled']);
    }

    public function review(Request $request, int $jobId): JsonResponse
    {
        $data = $request->validate(['rating' => ['required', 'integer', 'between:1,5'], 'comment' => ['nullable', 'string', 'max:1000']]);
        DB::transaction(function () use ($request, $jobId, $data): void {
            $job = DB::table('provider_jobs')->where('id', $jobId)->where('customer_id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($job, 404);
            abort_unless($job->status === 'completed', 409, 'Reviews are available after completion.');
            abort_if(DB::table('provider_reviews')->where('provider_job_id', $jobId)->exists(), 409, 'You have already reviewed this service.');
            DB::table('provider_reviews')->insert(['provider_job_id' => $jobId, 'provider_profile_id' => $job->provider_profile_id,
                'customer_id' => $request->user()->id, 'rating' => $data['rating'], 'comment' => trim($data['comment'] ?? ''),
                'created_at' => now(), 'updated_at' => now()]);
            $this->workspace->notify($job->provider_profile_id, 'New customer review', 'A customer reviewed your completed service.', '/provider/reviews');
        });

        return response()->json(['status' => 'reviewed'], 201);
    }
}
