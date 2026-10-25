<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ModerateReportRequest;
use App\Http\Requests\Admin\ResolveDisputeRequest;
use App\Http\Requests\Admin\ReviewActivationPaymentRequest;
use App\Http\Requests\Admin\ReviewProviderApplicationRequest;
use App\Http\Requests\Admin\ReviewServiceCoverRequest;
use App\Http\Requests\Admin\SaveServiceCategoryRequest;
use App\Http\Requests\Admin\SetProviderStatusRequest;
use App\Http\Requests\Admin\SetUserStatusRequest;
use App\Http\Requests\Admin\UpdatePlatformSettingsRequest;
use App\Models\User;
use App\Services\PlatformSettings;
use App\Services\ProviderWorkspace;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function __construct(private PlatformSettings $settings, private SecurityAuditLogger $audit, private ProviderWorkspace $workspace) {}

    private function pageSize(Request $request): int
    {
        return min(100, max(10, (int) $request->integer('per_page', 20)));
    }

    /**
     * Only someone in the conversation can report a message, and only one written by the other side.
     */
    private function canReportMessage(int $userId, int $messageId): bool
    {
        return DB::table('conversation_messages as m')->join('conversations as c', 'c.id', '=', 'm.conversation_id')
            ->join('provider_profiles as p', 'p.id', '=', 'c.provider_profile_id')->where('m.id', $messageId)
            ->where(fn ($query) => $query->where(fn ($customer) => $customer->where('c.customer_id', $userId)->where('m.sender_role', 'provider'))
                ->orWhere(fn ($provider) => $provider->where('p.user_id', $userId)->where('m.sender_role', 'customer')))
            ->exists();
    }

    public function overview(): JsonResponse
    {
        $trialQuota = (int) $this->settings->get('free_successful_client_quota', 10);
        $quotaProviders = DB::table('provider_profiles as p')->join('provider_jobs as j', 'j.provider_profile_id', '=', 'p.id')
            ->where('p.status', 'approved')->where('p.access_kind', 'trial')->where('j.status', 'completed')
            ->select('p.id')->groupBy('p.id')->havingRaw('COUNT(DISTINCT j.customer_id) >= ?', [$trialQuota]);
        $quotaReached = DB::query()->fromSub($quotaProviders, 'quota_reached_providers')->count();
        $recent = DB::table('security_audits as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->orderByDesc('a.created_at')->limit(8)
            ->get(['a.id', 'a.event_type as event', 'a.created_at', 'u.name as actor']);

        return response()->json(['data' => [
            'totalUsers' => User::query()->count(),
            'approvedProviders' => DB::table('provider_profiles')->where('status', 'approved')->count(),
            'pendingApplications' => DB::table('provider_profiles')->whereIn('status', ['pending', 'needs_changes'])->count(),
            'activeRequests' => DB::table('service_requests')->whereIn('status', ['new', 'accepted'])->count(),
            'completedJobs' => DB::table('provider_jobs')->where('status', 'completed')->count(),
            'openDisputes' => DB::table('service_disputes')->whereIn('status', ['open', 'in_review'])->count(),
            'quotaReachedProviders' => $quotaReached,
            'lifetimeActivations' => DB::table('provider_profiles')->where('access_kind', 'lifetime')->count(),
            'pendingPayments' => DB::table('activation_payments')->where('status', 'pending')->count(),
            'recentActivity' => $recent,
        ]]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = DB::table('users as u')->leftJoin('provider_profiles as p', 'p.user_id', '=', 'u.id')
            ->select('u.id', 'u.name', 'u.email', 'u.email_verified_at', 'u.status', 'u.created_at', 'p.id as provider_id', 'p.status as provider_status');
        if (filled($request->query('q'))) {
            $term = '%'.mb_strtolower(trim((string) $request->query('q'))).'%';
            $query->where(fn ($builder) => $builder->whereRaw('LOWER(u.name) LIKE ?', [$term])->orWhereRaw('LOWER(u.email) LIKE ?', [$term]));
        }
        if (in_array($request->query('status'), ['active', 'suspended'], true)) {
            $query->where('u.status', $request->query('status'));
        }

        return response()->json($query->orderByDesc('u.created_at')->paginate($this->pageSize($request)));
    }

    public function userDetails(int $userId): JsonResponse
    {
        $user = User::query()->findOrFail($userId);
        $provider = DB::table('provider_profiles')->where('user_id', $userId)->first();
        $requests = DB::table('service_requests')->where('customer_id', $userId)->count();
        $jobs = $provider ? DB::table('provider_jobs')->where('provider_profile_id', $provider->id)->count() : 0;

        return response()->json(['data' => [
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
            'emailVerified' => $user->hasVerifiedEmail(), 'status' => $user->status,
            'createdAt' => $user->created_at, 'customerRequests' => $requests, 'providerJobs' => $jobs,
            'provider' => $provider ? ['id' => $provider->id, 'displayName' => $provider->display_name, 'status' => $provider->status, 'verified' => (bool) $provider->verified] : null,
        ]]);
    }

    public function setUserStatus(SetUserStatusRequest $request, int $userId): JsonResponse
    {
        $status = $request->validated('status');
        $target = DB::transaction(function () use ($request, $userId, $status): User {
            $target = User::query()->whereKey($userId)->lockForUpdate()->firstOrFail();
            abort_if($target->hasAdminAccess(), 403, 'Admin accounts cannot be suspended from user management.');
            $old = $target->status;
            $target->forceFill(['status' => $status, 'suspended_at' => $status === 'suspended' ? now() : null,
                'suspension_reason' => $status === 'suspended' ? $request->validated('reason') : null])->save();
            $this->audit->record($status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', $request->user()->id, $request,
                ['target_user_id' => (int) $target->id, 'old_status' => $old, 'new_status' => $status]);

            return $target;
        });

        return response()->json(['id' => $target->id, 'status' => $target->status]);
    }

    public function providerApplications(Request $request): JsonResponse
    {
        $query = DB::table('provider_profiles as p')->join('users as u', 'u.id', '=', 'p.user_id')
            ->leftJoin('provider_verification_documents as d', 'd.provider_profile_id', '=', 'p.id')
            ->select('p.id', 'p.display_name', 'p.status', 'p.years_experience', 'p.created_at', 'u.name as owner_name', 'u.email',
                DB::raw('COUNT(d.id) as document_count'))->groupBy('p.id', 'p.display_name', 'p.status', 'p.years_experience', 'p.created_at', 'u.name', 'u.email');
        if (in_array($request->query('status'), ['pending', 'needs_changes', 'rejected'], true)) {
            $query->where('p.status', $request->query('status'));
        } elseif (! $request->boolean('all')) {
            $query->whereIn('p.status', ['pending', 'needs_changes']);
        }
        if (filled($request->query('q'))) {
            $term = '%'.mb_strtolower(trim((string) $request->query('q'))).'%';
            $query->where(fn ($builder) => $builder->whereRaw('LOWER(p.display_name) LIKE ?', [$term])->orWhereRaw('LOWER(u.name) LIKE ?', [$term])->orWhereRaw('LOWER(u.email) LIKE ?', [$term]));
        }

        return response()->json($query->orderByDesc('p.created_at')->paginate($this->pageSize($request)));
    }

    public function providerDetails(int $providerId): JsonResponse
    {
        $provider = DB::table('provider_profiles as p')->join('users as u', 'u.id', '=', 'p.user_id')->where('p.id', $providerId)
            ->select('p.*', 'u.name as owner_name', 'u.email', 'u.status as account_status', 'u.email_verified_at')->first();
        abort_unless($provider, 404);
        $services = DB::table('provider_services as s')->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->where('s.provider_profile_id', $providerId)->orderBy('c.name')->get(['s.id', 'c.name as category', 's.description', 's.active', 's.is_visible']);
        $areas = DB::table('provider_service_areas as a')->join('regions as r', 'r.code', '=', 'a.region_code')
            ->leftJoin('provinces as pr', 'pr.code', '=', 'a.province_code')->join('city_municipalities as c', 'c.code', '=', 'a.city_municipality_code')
            ->leftJoin('barangays as b', 'b.code', '=', 'a.barangay_code')->where('a.provider_profile_id', $providerId)
            ->get(['r.name as region', 'pr.name as province', 'c.name as city', 'b.name as barangay', 'a.active']);
        $documents = DB::table('provider_verification_documents')->where('provider_profile_id', $providerId)
            ->orderByDesc('created_at')->get(['id', 'original_name', 'mime_type', 'created_at']);
        $stats = DB::table('provider_jobs')->where('provider_profile_id', $providerId)
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed, COUNT(DISTINCT CASE WHEN status = ? THEN customer_id END) as successful_clients', ['completed', 'completed'])->first();

        return response()->json(['data' => [
            'provider' => $provider, 'services' => $services, 'areas' => $areas, 'documents' => $documents,
            'stats' => ['jobs' => (int) ($stats->total ?? 0), 'completed' => (int) ($stats->completed ?? 0), 'successfulClients' => (int) ($stats->successful_clients ?? 0)],
            'quota' => (int) $this->settings->get('free_successful_client_quota', 10),
        ]]);
    }

    public function providerDocument(Request $request, int $providerId, int $documentId)
    {
        $document = DB::table('provider_verification_documents')->where('id', $documentId)->where('provider_profile_id', $providerId)->first();
        abort_unless($document && Storage::disk('local')->exists($document->path), 404);
        $this->audit->record('PROVIDER_DOCUMENT_VIEWED', $request->user()->id, $request, ['provider_id' => $providerId, 'document_id' => $documentId]);

        return Storage::disk('local')->download($document->path, $document->original_name, ['Cache-Control' => 'private, no-store']);
    }

    public function decideProvider(ReviewProviderApplicationRequest $request, int $providerId): JsonResponse
    {
        $data = $request->validated();
        $provider = DB::transaction(function () use ($providerId, $data, $request) {
            $provider = DB::table('provider_profiles')->where('id', $providerId)->lockForUpdate()->first();
            abort_unless($provider, 404);
            abort_unless(in_array($provider->status, ['pending', 'needs_changes'], true), 409, 'Only pending applications can be reviewed.');
            DB::table('provider_profiles')->where('id', $provider->id)->update([
                'status' => $data['status'], 'review_note' => $data['note'] ?? null,
                'approved_at' => $data['status'] === 'approved' ? now() : null, 'updated_at' => now(),
            ]);
            $title = ['approved' => 'Provider application approved', 'needs_changes' => 'Provider application needs changes', 'rejected' => 'Provider application update'][$data['status']];
            $detail = $data['note'] ?? ($data['status'] === 'approved' ? 'Your provider workspace is ready to use.' : 'Please review your application status.');
            $this->workspace->notify((int) $provider->id, $title, $detail, '/provider');
            $this->audit->record('PROVIDER_'.strtoupper($data['status']), $request->user()->id, $request,
                ['provider_id' => (int) $provider->id, 'old_status' => $provider->status, 'new_status' => $data['status']]);

            return $provider;
        });

        return response()->json(['id' => $provider->id, 'status' => $data['status']]);
    }

    public function providers(Request $request): JsonResponse
    {
        $query = DB::table('provider_profiles as p')->join('users as u', 'u.id', '=', 'p.user_id')
            ->leftJoin('provider_reviews as rv', 'rv.provider_profile_id', '=', 'p.id')
            ->whereIn('p.status', ['approved', 'suspended'])->select('p.id', 'p.display_name', 'p.status', 'p.verified', 'p.access_kind', 'p.accepting_requests', 'u.name as owner_name', 'u.email')
            ->selectRaw('COALESCE(AVG(rv.rating), 0) as average_rating, COUNT(rv.id) as review_count')->groupBy('p.id', 'p.display_name', 'p.status', 'p.verified', 'p.access_kind', 'p.accepting_requests', 'u.name', 'u.email');
        if (filled($request->query('q'))) {
            $term = '%'.mb_strtolower(trim((string) $request->query('q'))).'%';
            $query->where(fn ($builder) => $builder->whereRaw('LOWER(p.display_name) LIKE ?', [$term])->orWhereRaw('LOWER(u.name) LIKE ?', [$term]));
        }

        return response()->json($query->orderBy('p.display_name')->paginate($this->pageSize($request)));
    }

    public function setProviderStatus(SetProviderStatusRequest $request, int $providerId): JsonResponse
    {
        $status = $request->validated('status');
        DB::transaction(function () use ($providerId, $status, $request): void {
            $provider = DB::table('provider_profiles')->where('id', $providerId)->lockForUpdate()->first();
            abort_unless($provider, 404);
            abort_if(! in_array($provider->status, ['approved', 'suspended'], true), 409, 'Only approved providers can be suspended or reactivated.');
            DB::table('provider_profiles')->where('id', $provider->id)->update([
                'status' => $status, 'accepting_requests' => $status === 'approved' ? $provider->accepting_requests : false,
                'suspended_at' => $status === 'suspended' ? now() : null, 'review_note' => $request->validated('reason'), 'updated_at' => now(),
            ]);
            $this->audit->record($status === 'suspended' ? 'PROVIDER_SUSPENDED' : 'PROVIDER_REACTIVATED', $request->user()->id, $request,
                ['provider_id' => (int) $provider->id, 'old_status' => $provider->status, 'new_status' => $status]);
        });

        return response()->json(['id' => $providerId, 'status' => $status]);
    }

    public function activateProvider(Request $request, int $providerId): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        DB::transaction(function () use ($providerId, $request, $data): void {
            $provider = DB::table('provider_profiles')->where('id', $providerId)->lockForUpdate()->first();
            abort_unless($provider && $provider->status === 'approved', 404);
            DB::table('provider_profiles')->where('id', $provider->id)->update(['access_kind' => 'lifetime', 'updated_at' => now()]);
            $this->workspace->notify((int) $provider->id, 'Lifetime provider access activated', 'AYOS has activated lifetime provider access for your account.', '/provider/access');
            $this->audit->record('PROVIDER_LIFETIME_ACCESS_GRANTED', $request->user()->id, $request, ['provider_id' => (int) $provider->id, 'reason' => $data['reason']]);
        });

        return response()->json(['id' => $providerId, 'accessKind' => 'lifetime']);
    }

    public function verifyProvider(Request $request, int $providerId): JsonResponse
    {
        $data = $request->validate(['verified' => ['required', 'boolean'], 'reason' => ['required', 'string', 'max:500']]);
        $provider = DB::table('provider_profiles')->where('id', $providerId)->first();
        abort_unless($provider, 404);
        DB::table('provider_profiles')->where('id', $providerId)->update(['verified' => $data['verified'], 'updated_at' => now()]);
        $this->audit->record($data['verified'] ? 'PROVIDER_IDENTITY_VERIFIED' : 'PROVIDER_IDENTITY_UNVERIFIED', $request->user()->id, $request,
            ['provider_id' => $providerId, 'reason' => $data['reason']]);

        return response()->json(['id' => $providerId, 'verified' => $data['verified']]);
    }

    public function listings(Request $request): JsonResponse
    {
        $services = DB::table('provider_services as s')->join('provider_profiles as p', 'p.id', '=', 's.provider_profile_id')
            ->join('users as u', 'u.id', '=', 'p.user_id')->join('service_categories as c', 'c.id', '=', 's.service_category_id')
            ->orderByDesc('s.created_at')->limit(200)->get(['s.id', 's.provider_profile_id', 's.description', 's.active', 's.is_visible', 's.created_at',
                's.cover_path', 's.cover_status', 's.cover_review_note', 's.cover_fit', 's.cover_focus_x', 's.cover_focus_y', 's.cover_submitted_at',
                'p.display_name', 'u.name as owner_name', 'c.name as category'])
            ->map(fn ($item) => ['id' => $item->id, 'type' => 'service', ...((array) $item),
                'cover_image' => $item->cover_path ? Storage::disk('public')->url($item->cover_path) : null])->all();
        $portfolio = DB::table('provider_portfolio_items as i')->join('provider_profiles as p', 'p.id', '=', 'i.provider_profile_id')
            ->join('users as u', 'u.id', '=', 'p.user_id')->orderByDesc('i.created_at')->limit(200)->get(['i.id', 'i.provider_profile_id', 'i.title', 'i.category', 'i.image_path', 'i.is_visible', 'i.created_at', 'p.display_name', 'u.name as owner_name'])
            ->map(fn ($item) => ['id' => $item->id, 'type' => 'portfolio', ...((array) $item), 'image' => Storage::disk('public')->url($item->image_path)])->all();
        // Covers waiting for review lead the list so the queue never hides behind older listings.
        $items = collect([...$services, ...$portfolio])->sortBy([
            fn (array $a, array $b): int => (int) (($b['cover_status'] ?? null) === 'pending') <=> (int) (($a['cover_status'] ?? null) === 'pending'),
            fn (array $a, array $b): int => strcmp((string) $b['created_at'], (string) $a['created_at']),
        ])->values();
        if (filled($request->query('q'))) {
            $term = mb_strtolower(trim((string) $request->query('q')));
            $items = $items->filter(fn (array $item): bool => str_contains(mb_strtolower(implode(' ', array_map('strval', [
                $item['title'] ?? '', $item['category'] ?? '', $item['display_name'] ?? '', $item['owner_name'] ?? '', $item['description'] ?? '',
            ]))), $term))->values();
        }
        if ($request->query('visibility') === 'hidden') {
            $items = $items->where('is_visible', false)->values();
        }
        if ($request->query('visibility') === 'visible') {
            $items = $items->where('is_visible', true)->values();
        }

        return response()->json(['data' => $items->take(200)]);
    }

    public function setListingVisibility(Request $request, string $type, int $listingId): JsonResponse
    {
        $data = $request->validate(['is_visible' => ['required', 'boolean'], 'reason' => ['required', 'string', 'max:500']]);
        $table = match ($type) {
            'service' => 'provider_services', 'portfolio' => 'provider_portfolio_items', default => abort(404)
        };
        DB::transaction(function () use ($table, $listingId, $request, $data, $type): void {
            $item = DB::table($table)->where('id', $listingId)->lockForUpdate()->first();
            abort_unless($item, 404);
            DB::table($table)->where('id', $listingId)->update(['is_visible' => $data['is_visible'], 'updated_at' => now()]);
            $this->audit->record($data['is_visible'] ? 'LISTING_RESTORED' : 'LISTING_HIDDEN', $request->user()->id, $request,
                ['listing_type' => $type, 'listing_id' => $listingId, 'provider_id' => (int) $item->provider_profile_id, 'reason' => $data['reason']]);
        });

        return response()->json(['id' => $listingId, 'type' => $type, 'is_visible' => $data['is_visible']]);
    }

    /**
     * Approves a service cover for the customer Home page, or rejects it with a reason the provider can act on.
     */
    public function reviewServiceCover(ReviewServiceCoverRequest $request, int $serviceId): JsonResponse
    {
        $data = $request->validated();
        $service = DB::transaction(function () use ($request, $data, $serviceId): object {
            $service = DB::table('provider_services')->where('id', $serviceId)->lockForUpdate()->first();
            abort_unless($service?->cover_path, 404, 'This service has no cover to review.');
            $service->category = DB::table('service_categories')->where('id', $service->service_category_id)->value('name');
            $note = $data['decision'] === 'rejected' ? trim($data['reason']) : null;
            DB::table('provider_services')->where('id', $serviceId)->update([
                'cover_status' => $data['decision'], 'cover_review_note' => $note, 'cover_reviewed_at' => now(), 'updated_at' => now(),
            ]);
            $this->audit->record($data['decision'] === 'approved' ? 'SERVICE_COVER_APPROVED' : 'SERVICE_COVER_REJECTED', $request->user()->id, $request,
                ['service_id' => $serviceId, 'provider_id' => (int) $service->provider_profile_id, 'reason' => $note]);
            if ($data['decision'] === 'approved') {
                $this->workspace->notify((int) $service->provider_profile_id, 'Cover approved',
                    "Your {$service->category} cover can now appear on the customer Home page.", '/provider/services');
            } else {
                $this->workspace->notify((int) $service->provider_profile_id, 'Cover not approved',
                    "Your {$service->category} cover was not approved: {$note}", '/provider/services');
            }

            return $service;
        });

        return response()->json(['id' => $service->id, 'cover_status' => $data['decision']]);
    }

    public function requests(Request $request): JsonResponse
    {
        $query = DB::table('service_requests as r')->join('users as u', 'u.id', '=', 'r.customer_id')
            ->join('provider_profiles as p', 'p.id', '=', 'r.provider_profile_id')->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->join('service_locations as l', 'l.id', '=', 'r.service_location_id')->join('city_municipalities as city', 'city.code', '=', 'l.city_municipality_code')
            ->select('r.id', 'r.status', 'r.preferred_at', 'r.created_at', 'u.name as customer_name', 'p.display_name as provider_name', 'c.name as service', 'city.name as city');
        if (filled($request->query('status'))) {
            $query->where('r.status', $request->query('status'));
        }
        if (filled($request->query('q'))) {
            $term = '%'.mb_strtolower(trim((string) $request->query('q'))).'%';
            $query->where(fn ($builder) => $builder->whereRaw('LOWER(u.name) LIKE ?', [$term])->orWhereRaw('LOWER(p.display_name) LIKE ?', [$term])->orWhereRaw('LOWER(c.name) LIKE ?', [$term]));
        }

        return response()->json($query->orderByDesc('r.created_at')->paginate($this->pageSize($request)));
    }

    public function categories(): JsonResponse
    {
        return response()->json(['data' => DB::table('service_categories')->orderBy('name')->get()]);
    }

    public function createCategory(SaveServiceCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();
        $id = DB::table('service_categories')->insertGetId(['name' => trim($data['name']), 'slug' => $data['slug'], 'description' => trim($data['description'] ?? ''),
            'is_active' => $data['is_active'] ?? true, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record('SERVICE_CATEGORY_CREATED', $request->user()->id, $request, ['category_id' => $id, 'slug' => $data['slug']]);

        return response()->json(['data' => DB::table('service_categories')->find($id)], 201);
    }

    public function updateCategory(SaveServiceCategoryRequest $request, int $categoryId): JsonResponse
    {
        $data = $request->validated();
        $old = DB::table('service_categories')->where('id', $categoryId)->first();
        abort_unless($old, 404);
        DB::table('service_categories')->where('id', $categoryId)->update([...$data, 'name' => trim($data['name']), 'description' => trim($data['description'] ?? ''), 'updated_at' => now()]);
        $this->audit->record('SERVICE_CATEGORY_UPDATED', $request->user()->id, $request, ['category_id' => $categoryId, 'old_name' => $old->name, 'new_name' => $data['name']]);

        return response()->json(['data' => DB::table('service_categories')->find($categoryId)]);
    }

    public function setCategoryStatus(Request $request, int $categoryId): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $old = DB::table('service_categories')->where('id', $categoryId)->first();
        abort_unless($old, 404);
        DB::table('service_categories')->where('id', $categoryId)->update(['is_active' => $data['is_active'], 'updated_at' => now()]);
        $this->audit->record($data['is_active'] ? 'SERVICE_CATEGORY_ENABLED' : 'SERVICE_CATEGORY_DISABLED', $request->user()->id, $request, ['category_id' => $categoryId]);

        return response()->json(['id' => $categoryId, 'is_active' => $data['is_active']]);
    }

    public function locations(Request $request): JsonResponse
    {
        $query = DB::table('city_municipalities as city')->join('regions as r', 'r.code', '=', 'city.region_code')
            ->leftJoin('provinces as p', 'p.code', '=', 'city.province_code')->leftJoin('supported_service_locations as s', 's.city_municipality_code', '=', 'city.code')
            ->select('city.code', 'city.name', 'city.type', 'r.name as region', 'p.name as province', DB::raw('COALESCE(s.is_active, false) as is_active'));
        if (filled($request->query('q'))) {
            $term = '%'.mb_strtolower(trim((string) $request->query('q'))).'%';
            $query->where(fn ($builder) => $builder->whereRaw('LOWER(city.name) LIKE ?', [$term])->orWhereRaw('LOWER(p.name) LIKE ?', [$term])->orWhereRaw('LOWER(r.name) LIKE ?', [$term]));
        }

        return response()->json($query->orderBy('r.name')->orderBy('p.name')->orderBy('city.name')->paginate($this->pageSize($request)));
    }

    public function setLocationStatus(Request $request, string $cityCode): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $city = DB::table('city_municipalities')->where('code', $cityCode)->first();
        abort_unless($city, 404);
        DB::transaction(function () use ($request, $cityCode, $data): void {
            $current = DB::table('supported_service_locations')->where('city_municipality_code', $cityCode)->lockForUpdate()->first();
            $old = (bool) ($current?->is_active ?? false);
            $values = ['is_active' => $data['is_active'], 'updated_by' => $request->user()->id, 'updated_at' => now()];
            if ($current) {
                DB::table('supported_service_locations')->where('city_municipality_code', $cityCode)->update($values);
            } else {
                DB::table('supported_service_locations')->insert($values + ['city_municipality_code' => $cityCode, 'created_at' => now()]);
            }
            $this->audit->record('SUPPORTED_LOCATION_CHANGED', $request->user()->id, $request, ['city_code' => $cityCode, 'old_active' => $old, 'new_active' => (bool) $data['is_active']]);
        });

        return response()->json(['city_code' => $cityCode, 'is_active' => (bool) $data['is_active']]);
    }

    public function reviews(Request $request): JsonResponse
    {
        $query = DB::table('provider_reviews as rv')->join('provider_profiles as p', 'p.id', '=', 'rv.provider_profile_id')
            ->join('users as u', 'u.id', '=', 'rv.customer_id')->join('provider_jobs as j', 'j.id', '=', 'rv.provider_job_id')
            ->join('service_requests as sr', 'sr.id', '=', 'j.service_request_id')->join('service_categories as c', 'c.id', '=', 'sr.service_category_id')
            ->select('rv.id', 'rv.rating', 'rv.comment', 'rv.created_at', 'p.display_name as provider_name', 'u.name as customer_name', 'c.name as service');
        if ($request->filled('rating')) {
            $query->where('rv.rating', (int) $request->query('rating'));
        }

        return response()->json($query->orderByDesc('rv.created_at')->paginate($this->pageSize($request)));
    }

    public function reports(Request $request): JsonResponse
    {
        $query = DB::table('content_reports as r')->leftJoin('users as u', 'u.id', '=', 'r.reporter_id')
            ->select('r.*', 'u.name as reporter_name');
        if (in_array($request->query('status'), ['open', 'actioned', 'dismissed'], true)) {
            $query->where('r.status', $request->query('status'));
        }

        return response()->json($query->orderByDesc('r.created_at')->paginate($this->pageSize($request)));
    }

    public function createReport(Request $request): JsonResponse
    {
        $data = $request->validate([
            'target_type' => ['required', Rule::in(['provider', 'service', 'portfolio', 'review', 'request', 'message'])],
            'target_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', Rule::in(['unsafe', 'fraud', 'harassment', 'inappropriate', 'spam', 'other'])],
            'details' => ['nullable', 'string', 'max:2000'],
        ]);
        $targetTable = ['provider' => 'provider_profiles', 'service' => 'provider_services', 'portfolio' => 'provider_portfolio_items', 'review' => 'provider_reviews', 'request' => 'service_requests', 'message' => 'conversation_messages'][$data['target_type']];
        abort_unless(DB::table($targetTable)->where('id', $data['target_id'])->exists(), 404);
        if ($data['target_type'] === 'message') {
            abort_unless($this->canReportMessage($request->user()->id, $data['target_id']), 404);
        }
        $id = DB::table('content_reports')->insertGetId([...$data, 'reporter_id' => $request->user()->id, 'status' => 'open', 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['id' => $id, 'status' => 'open'], 201);
    }

    public function reviewReport(ModerateReportRequest $request, int $reportId): JsonResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($request, $reportId, $data): void {
            $report = DB::table('content_reports')->where('id', $reportId)->lockForUpdate()->first();
            abort_unless($report, 404);
            if (($data['action'] ?? null) === 'hide') {
                $table = match ($report->target_type) {
                    'service' => 'provider_services', 'portfolio' => 'provider_portfolio_items', 'message' => 'conversation_messages', default => null
                };
                abort_unless($table, 422, 'Only provider service and portfolio listings and messages can be hidden from a report.');
                DB::table($table)->where('id', $report->target_id)->update($table === 'conversation_messages'
                    ? ['hidden_at' => now(), 'updated_at' => now()]
                    : ['is_visible' => false, 'updated_at' => now()]);
            }
            DB::table('content_reports')->where('id', $report->id)->update(['status' => $data['status'], 'review_note' => $data['note'] ?? null,
                'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
            $this->audit->record('CONTENT_REPORT_REVIEWED', $request->user()->id, $request,
                ['report_id' => (int) $report->id, 'target_type' => $report->target_type, 'target_id' => (int) $report->target_id, 'status' => $data['status'], 'action' => $data['action'] ?? 'none']);
        });

        return response()->json(['id' => $reportId, 'status' => $data['status']]);
    }

    public function disputes(Request $request): JsonResponse
    {
        $query = DB::table('service_disputes as d')->join('provider_jobs as j', 'j.id', '=', 'd.provider_job_id')
            ->join('users as u', 'u.id', '=', 'd.customer_id')->join('provider_profiles as p', 'p.id', '=', 'd.provider_profile_id')
            ->select('d.id', 'd.reason', 'd.status', 'd.created_at', 'u.name as customer_name', 'p.display_name as provider_name', 'j.id as job_id');
        if (in_array($request->query('status'), ['open', 'in_review', 'resolved', 'dismissed'], true)) {
            $query->where('d.status', $request->query('status'));
        }

        return response()->json($query->orderByDesc('d.created_at')->paginate($this->pageSize($request)));
    }

    public function disputeDetails(Request $request, int $disputeId): JsonResponse
    {
        $dispute = DB::table('service_disputes as d')->join('provider_jobs as j', 'j.id', '=', 'd.provider_job_id')
            ->join('users as customer', 'customer.id', '=', 'd.customer_id')->join('provider_profiles as p', 'p.id', '=', 'd.provider_profile_id')
            ->join('users as provider_user', 'provider_user.id', '=', 'p.user_id')->join('service_requests as r', 'r.id', '=', 'j.service_request_id')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')->where('d.id', $disputeId)
            ->select('d.*', 'j.status as job_status', 'customer.name as customer_name', 'provider_user.name as provider_owner', 'p.display_name', 'c.name as service', 'r.description as request_description')->first();
        abort_unless($dispute, 404);
        $evidence = DB::table('service_dispute_evidence')->where('service_dispute_id', $disputeId)->orderBy('created_at')->get(['id', 'original_name', 'created_at']);

        return response()->json(['data' => ['dispute' => $dispute, 'evidence' => $evidence]]);
    }

    public function disputeEvidence(Request $request, int $disputeId, int $evidenceId)
    {
        $evidence = DB::table('service_dispute_evidence')->where('id', $evidenceId)->where('service_dispute_id', $disputeId)->first();
        abort_unless($evidence && Storage::disk('local')->exists($evidence->path), 404);
        $this->audit->record('DISPUTE_EVIDENCE_VIEWED', $request->user()->id, $request, ['dispute_id' => $disputeId, 'evidence_id' => $evidenceId]);

        return Storage::disk('local')->download($evidence->path, $evidence->original_name, ['Cache-Control' => 'private, no-store']);
    }

    public function resolveDispute(ResolveDisputeRequest $request, int $disputeId): JsonResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($request, $disputeId, $data): void {
            $dispute = DB::table('service_disputes')->where('id', $disputeId)->lockForUpdate()->first();
            abort_unless($dispute, 404);
            abort_if(in_array($dispute->status, ['resolved', 'dismissed'], true), 409, 'This dispute is already closed.');
            DB::table('service_disputes')->where('id', $dispute->id)->update(['status' => $data['status'], 'resolution_note' => $data['resolution_note'],
                'resolved_by' => $request->user()->id, 'resolved_at' => now(), 'updated_at' => now()]);
            $this->workspace->notify((int) $dispute->provider_profile_id, 'Dispute update', 'An administrator reviewed the service dispute.', '/provider/requests');
            $this->audit->record('DISPUTE_RESOLVED', $request->user()->id, $request, ['dispute_id' => (int) $dispute->id, 'status' => $data['status']]);
        });

        return response()->json(['id' => $disputeId, 'status' => $data['status']]);
    }

    public function payments(Request $request): JsonResponse
    {
        $query = DB::table('activation_payments as a')->join('provider_profiles as p', 'p.id', '=', 'a.provider_profile_id')->join('users as u', 'u.id', '=', 'p.user_id')
            ->select('a.id', 'a.amount', 'a.currency', 'a.reference', 'a.method', 'a.status', 'a.transaction_id', 'a.admin_note', 'a.created_at', 'p.display_name', 'u.name as owner_name', 'u.email');
        if (in_array($request->query('status'), ['pending', 'confirmed', 'rejected'], true)) {
            $query->where('a.status', $request->query('status'));
        }

        return response()->json($query->orderByDesc('a.created_at')->paginate($this->pageSize($request)));
    }

    public function reviewPayment(ReviewActivationPaymentRequest $request, int $paymentId): JsonResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($request, $paymentId, $data): void {
            $payment = DB::table('activation_payments')->where('id', $paymentId)->lockForUpdate()->first();
            abort_unless($payment, 404);
            abort_if($payment->status !== 'pending', 409, 'Only pending payments can be reviewed.');
            $provider = DB::table('provider_profiles')->where('id', $payment->provider_profile_id)->lockForUpdate()->first();
            if ($data['status'] === 'confirmed') {
                DB::table('provider_profiles')->where('id', $provider->id)->update(['access_kind' => 'lifetime', 'updated_at' => now()]);
                $this->workspace->notify((int) $provider->id, 'Lifetime access active', 'Your activation payment was confirmed.', '/provider/access');
            }
            DB::table('activation_payments')->where('id', $paymentId)->update(['status' => $data['status'], 'admin_note' => $data['admin_note'] ?? null,
                'reviewed_by' => $request->user()->id, 'reviewed_at' => now(), 'updated_at' => now()]);
            $this->audit->record($data['status'] === 'confirmed' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_REJECTED', $request->user()->id, $request,
                ['payment_id' => $paymentId, 'provider_id' => (int) $provider->id, 'amount' => (int) $payment->amount]);
        });

        return response()->json(['id' => $paymentId, 'status' => $data['status']]);
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => $this->settings->all()]);
    }

    public function updateSettings(UpdatePlatformSettingsRequest $request): JsonResponse
    {
        $values = $request->validated();
        $before = $this->settings->all();
        $after = array_replace($before, $values);
        if ($after['activation_payments_enabled'] && ((int) $after['lifetime_activation_fee'] < 1 || ! filled($after['activation_payment_instructions']))) {
            abort(422, 'Add payment instructions before enabling manual activation payment submissions.');
        }
        DB::transaction(function () use ($request, $values, $before): void {
            $this->settings->update($values, $request->user()->id);
            foreach ($values as $key => $value) {
                if (($before[$key] ?? null) === $value) {
                    continue;
                }
                $event = match ($key) {
                    'free_successful_client_quota' => 'QUOTA_CHANGED', 'lifetime_activation_fee' => 'ACTIVATION_FEE_CHANGED',
                    'maintenance_mode' => $value ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
                    default => 'PLATFORM_SETTING_CHANGED',
                };
                $safeValue = is_bool($value) ? ($value ? 'true' : 'false') : mb_substr((string) $value, 0, 120);
                $this->audit->record($event, $request->user()->id, $request, ['setting' => $key, 'old_value' => (string) ($before[$key] ?? ''), 'new_value' => $safeValue]);
            }
        });

        return response()->json(['data' => $this->settings->all()]);
    }

    public function publicNotices(): JsonResponse
    {
        return response()->json(['data' => DB::table('platform_notices')->where('is_active', true)->orderByDesc('published_at')->limit(5)->get(['id', 'title', 'body', 'published_at'])]);
    }

    public function notices(Request $request): JsonResponse
    {
        return response()->json(DB::table('platform_notices')->orderByDesc('created_at')->paginate($this->pageSize($request)));
    }

    public function saveNotice(Request $request, ?int $noticeId = null): JsonResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:120'], 'body' => ['required', 'string', 'max:1000'], 'is_active' => ['required', 'boolean']]);
        $noticeId = DB::transaction(function () use ($request, $data, $noticeId): int {
            if ($data['is_active']) {
                DB::table('platform_notices')->where('is_active', true)->update(['is_active' => false, 'updated_at' => now()]);
            }
            if ($noticeId) {
                abort_unless(DB::table('platform_notices')->where('id', $noticeId)->exists(), 404);
                DB::table('platform_notices')->where('id', $noticeId)->update([...$data, 'published_at' => $data['is_active'] ? now() : null, 'updated_at' => now()]);
            } else {
                $noticeId = DB::table('platform_notices')->insertGetId([...$data, 'created_by' => $request->user()->id, 'published_at' => $data['is_active'] ? now() : null, 'created_at' => now(), 'updated_at' => now()]);
            }
            $this->audit->record('PLATFORM_NOTICE_SAVED', $request->user()->id, $request, ['notice_id' => $noticeId, 'active' => $data['is_active'] ? 'true' : 'false']);

            return $noticeId;
        });

        return response()->json(['data' => DB::table('platform_notices')->where('id', $noticeId)->first()]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = DB::table('security_audits as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->select('a.id', 'a.user_id', 'u.name as actor', 'a.event_type', 'a.ip_address', 'a.user_agent', 'a.metadata', 'a.created_at');
        if ($request->filled('event')) {
            $query->where('a.event_type', $request->query('event'));
        }
        if ($request->filled('user_id')) {
            $query->where('a.user_id', (int) $request->query('user_id'));
        }

        return response()->json($query->orderByDesc('a.created_at')->paginate($this->pageSize($request)));
    }

    public function analytics(): JsonResponse
    {
        $count = fn (string $table, string $column, string $value) => DB::table($table)->where($column, $value)->count();
        $popular = DB::table('service_requests as r')->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->select('c.name', DB::raw('COUNT(r.id) as requests'))->groupBy('c.id', 'c.name')->orderByDesc('requests')->limit(8)->get();
        $dateExpression = DB::connection()->getDriverName() === 'pgsql' ? 'created_at::date' : 'date(created_at)';
        $signups = DB::table('users')->selectRaw("$dateExpression as day, COUNT(*) as total")->where('created_at', '>=', now()->subDays(29))->groupByRaw($dateExpression)->orderBy('day')->get();
        $total = DB::table('service_requests')->count();
        $cancelled = $count('service_requests', 'status', 'cancelled');
        $disputes = DB::table('service_disputes')->count();

        return response()->json(['data' => [
            'signups' => $signups, 'popularServices' => $popular, 'requests' => $total,
            'completedJobs' => $count('provider_jobs', 'status', 'completed'), 'cancellationRate' => $total ? round($cancelled * 100 / $total, 1) : 0,
            'disputeRate' => $total ? round($disputes * 100 / $total, 1) : 0,
            'activationConversion' => DB::table('activation_payments')->where('status', 'confirmed')->count(),
        ]]);
    }

    public function security(): JsonResponse
    {
        $admins = DB::table('user_roles as ur')->join('roles as r', 'r.id', '=', 'ur.role_id')->join('users as u', 'u.id', '=', 'ur.user_id')
            ->whereIn('r.slug', ['admin', 'super_admin', 'moderator', 'support'])->select('u.id', 'u.name', 'u.email', 'r.name as role', 'u.two_factor_confirmed_at', 'u.updated_at')->orderBy('u.name')->get();
        $events = DB::table('security_audits as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->where('a.event_type', 'like', 'ADMIN_%')
            ->orderByDesc('a.created_at')->limit(20)->get(['a.id', 'a.event_type', 'a.created_at', 'u.name as actor']);

        return response()->json(['data' => ['administrators' => $admins, 'recentSecurityEvents' => $events]]);
    }
}
