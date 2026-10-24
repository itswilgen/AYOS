<?php

namespace App\Services;

use App\Models\ServiceLocation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProviderWorkspace
{
    public function __construct(private PlatformSettings $settings) {}

    public function profile(int $userId): ?object
    {
        return DB::table('provider_profiles')->where('user_id', $userId)->first();
    }

    public function approved(int $userId): object
    {
        $profile = $this->profile($userId);
        abort_unless($profile?->status === 'approved', 403, 'Your provider application is not approved.');

        return $profile;
    }

    public function completedCount(int $profileId): int
    {
        return DB::table('provider_jobs')->where('provider_profile_id', $profileId)->where('status', 'completed')->distinct()->count('customer_id');
    }

    public function canReceive(object $profile): bool
    {
        return $profile->status === 'approved'
            && (bool) $profile->accepting_requests
            && ($profile->access_kind === 'lifetime' || $this->completedCount($profile->id) < $this->settings->get('free_successful_client_quota', 10));
    }

    public function notify(int $profileId, string $title, string $detail, string $href): void
    {
        DB::table('provider_notifications')->insert([
            'provider_profile_id' => $profileId, 'title' => $title, 'detail' => $detail,
            'href' => $href, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function notifyCustomer(int $customerId, string $title, string $detail, string $href = '/my-requests'): void
    {
        DB::table('customer_notifications')->insert([
            'customer_id' => $customerId, 'title' => $title, 'detail' => $detail,
            'href' => $href, 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function data(int $userId): array
    {
        $profile = $this->profile($userId);
        if (! $profile || $profile->status !== 'approved') {
            return ['approved' => false, 'applicationStatus' => $profile?->status ?? 'none', 'acceptingRequests' => false,
                'requests' => [], 'jobs' => [], 'services' => [], 'areas' => [], 'reviews' => [],
                'profile' => ['displayName' => $profile?->display_name ?? '', 'bio' => '', 'yearsExperience' => 0, 'photo' => null, 'verified' => false, 'portfolio' => []],
                'access' => ['kind' => 'trial', 'successfulClients' => 0, 'limit' => $this->settings->get('free_successful_client_quota', 10), 'activationFee' => $this->settings->get('lifetime_activation_fee', 0), 'paymentStatus' => null, 'paymentReference' => null,
                    'activationPaymentsEnabled' => (bool) $this->settings->get('activation_payments_enabled', false), 'activationPaymentInstructions' => $this->settings->get('activation_payment_instructions', '')],
                'notifications' => []];
        }
        $pid = $profile->id;
        $requests = DB::table('service_requests as r')
            ->join('users as u', 'u.id', '=', 'r.customer_id')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->join('service_locations as l', 'l.id', '=', 'r.service_location_id')
            ->join('city_municipalities as city', 'city.code', '=', 'l.city_municipality_code')
            ->leftJoin('provinces as province', 'province.code', '=', 'l.province_code')
            ->where('r.provider_profile_id', $pid)->orderByDesc('r.created_at')
            ->select('r.*', 'u.name as customer_name', 'c.name as service_name', 'city.name as city_name', 'province.name as province_name')->get();
        $requestIds = $requests->pluck('id')->all();
        $photos = DB::table('service_request_photos')->whereIn('service_request_id', $requestIds)->get()->groupBy('service_request_id');
        $requestMap = $requests->keyBy('id');
        $locations = ServiceLocation::query()->with('barangay')->whereIn('id', $requests->pluck('service_location_id')->all())->get()->keyBy('id');
        $jobs = DB::table('provider_jobs')->where('provider_profile_id', $pid)->orderByDesc('created_at')->get()->map(function ($job) use ($requestMap, $locations) {
            $request = $requestMap->get($job->service_request_id);
            $location = $request ? $locations->get($request->service_location_id) : null;

            return ['id' => (string) $job->id, 'requestId' => (string) $job->service_request_id,
                'service' => $request?->service_name ?? '', 'customerName' => $this->firstName($request?->customer_name),
                'approximateLocation' => $this->location($request), 'scheduledAt' => $job->scheduled_at,
                'address' => $location ? implode(', ', array_filter([$location->address_line, $location->barangay?->name, $request?->city_name, $request?->province_name])) : null,
                'status' => $job->status];
        })->all();
        $services = DB::table('provider_services as s')->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->where('s.provider_profile_id', $pid)->where('s.is_visible', true)->orderBy('c.name')->get(['s.id', 'c.name as category', 's.description', 's.active'])
            ->map(fn ($s) => ['id' => (string) $s->id, 'category' => $s->category, 'description' => $s->description, 'active' => (bool) $s->active])->all();
        $areas = DB::table('provider_service_areas as a')->join('regions as r', 'r.code', '=', 'a.region_code')
            ->join('city_municipalities as c', 'c.code', '=', 'a.city_municipality_code')
            ->leftJoin('provinces as p', 'p.code', '=', 'a.province_code')
            ->leftJoin('barangays as b', 'b.code', '=', 'a.barangay_code')
            ->where('a.provider_profile_id', $pid)->orderBy('c.name')
            ->get(['a.id', 'a.active', 'r.name as region', 'p.name as province', 'c.name as city', 'b.name as barangay'])
            ->map(fn ($a) => ['id' => (string) $a->id, 'region' => $a->region, 'province' => $a->province ?? '', 'city' => $a->city, 'barangay' => $a->barangay, 'active' => (bool) $a->active])->all();
        $reviews = DB::table('provider_reviews as rv')->join('provider_jobs as j', 'j.id', '=', 'rv.provider_job_id')
            ->join('service_requests as r', 'r.id', '=', 'j.service_request_id')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->join('users as u', 'u.id', '=', 'rv.customer_id')
            ->where('rv.provider_profile_id', $pid)->orderByDesc('rv.created_at')
            ->get(['rv.id', 'rv.rating', 'rv.comment', 'rv.created_at', 'c.name as service', 'u.name as customer_name'])
            ->map(fn ($r) => ['id' => (string) $r->id, 'rating' => $r->rating, 'comment' => $r->comment,
                'service' => $r->service, 'date' => $r->created_at, 'customerName' => $this->firstName($r->customer_name)])->all();
        $portfolio = DB::table('provider_portfolio_items')->where('provider_profile_id', $pid)->where('is_visible', true)->orderByDesc('id')->get()
            ->map(fn ($item) => ['id' => (string) $item->id, 'title' => $item->title, 'category' => $item->category,
                'image' => Storage::disk('public')->url($item->image_path)])->all();
        $latestActivationPayment = DB::table('activation_payments')->where('provider_profile_id', $pid)->orderByDesc('id')->first();
        $notifications = DB::table('provider_notifications')->where('provider_profile_id', $pid)->orderByDesc('created_at')->orderByDesc('id')->limit(100)->get()
            ->map(fn ($note) => ['id' => (string) $note->id, 'title' => $note->title, 'detail' => $note->detail,
                'createdAt' => $note->created_at, 'read' => $note->read_at !== null, 'href' => $note->href])->all();

        return [
            'approved' => true, 'applicationStatus' => 'approved', 'acceptingRequests' => (bool) $profile->accepting_requests,
            'requests' => $requests->map(fn ($r) => ['id' => (string) $r->id, 'service' => $r->service_name,
                'customerName' => $this->firstName($r->customer_name), 'approximateLocation' => $this->location($r),
                'preferredAt' => $r->preferred_at, 'description' => $r->description, 'notes' => $r->notes,
                'photos' => ($photos->get($r->id) ?? collect())->map(fn ($photo) => '/api/provider/requests/'.$r->id.'/photos/'.$photo->id)->all(),
                'createdAt' => $r->created_at, 'status' => $r->status])->all(),
            'jobs' => $jobs, 'services' => $services, 'areas' => $areas, 'reviews' => $reviews,
            'profile' => ['displayName' => $profile->display_name, 'bio' => $profile->bio,
                'yearsExperience' => $profile->years_experience, 'photo' => $profile->photo_path ? Storage::disk('public')->url($profile->photo_path) : null,
                'verified' => (bool) $profile->verified, 'portfolio' => $portfolio],
            'access' => ['kind' => $profile->access_kind, 'successfulClients' => $this->completedCount($pid),
                'limit' => $this->settings->get('free_successful_client_quota', 10), 'activationFee' => $this->settings->get('lifetime_activation_fee', 0),
                'paymentStatus' => $latestActivationPayment?->status, 'paymentReference' => $latestActivationPayment?->reference,
                'activationPaymentsEnabled' => (bool) $this->settings->get('activation_payments_enabled', false),
                'activationPaymentInstructions' => $this->settings->get('activation_payment_instructions', '')],
            'notifications' => $notifications,
        ];
    }

    private function firstName(?string $name): string
    {
        return explode(' ', trim($name ?: 'Customer'))[0];
    }

    private function location(?object $request): string
    {
        if (! $request) {
            return '';
        }

        return implode(', ', array_filter([$request->city_name, $request->province_name]));
    }
}
