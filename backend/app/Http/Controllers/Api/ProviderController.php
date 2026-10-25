<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Provider\SubmitActivationPaymentRequest;
use App\Services\Conversations;
use App\Services\PlatformSettings;
use App\Services\ProviderWorkspace;
use App\Services\PublicImageStore;
use App\Services\SecurityAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class ProviderController extends Controller
{
    public function __construct(private ProviderWorkspace $workspace, private PlatformSettings $settings, private SecurityAuditLogger $audit, private PublicImageStore $images, private Conversations $conversations) {}

    public function submitActivationPayment(SubmitActivationPaymentRequest $request): JsonResponse
    {
        abort_unless($this->settings->get('activation_payments_enabled', false), 503, 'Provider activation payments are not available yet.');
        $data = $request->validated();
        $id = DB::transaction(function () use ($request, $data): int {
            $profile = DB::table('provider_profiles')->where('user_id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($profile && $profile->status === 'approved', 403, 'An approved provider account is required.');
            abort_if($profile->access_kind === 'lifetime', 409, 'Lifetime access is already active.');
            $fee = (int) $this->settings->get('lifetime_activation_fee', 0);
            abort_if($fee < 1, 409, 'Lifetime activation is not configured yet.');
            abort_if(DB::table('activation_payments')->where('provider_profile_id', $profile->id)->where('status', 'pending')->exists(), 409, 'A payment reference is already awaiting review.');
            $id = DB::table('activation_payments')->insertGetId([
                'provider_profile_id' => $profile->id, 'amount' => $fee, 'currency' => 'PHP', 'reference' => trim($data['reference']),
                'method' => 'manual', 'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->audit->record('ACTIVATION_PAYMENT_SUBMITTED', $request->user()->id, $request, ['payment_id' => $id, 'provider_profile_id' => (int) $profile->id, 'amount' => $fee]);

            return $id;
        });

        return response()->json(['id' => $id, 'status' => 'pending'], 201);
    }

    public function workspace(Request $request): JsonResponse
    {
        return response()->json($this->workspace->data($request->user()->id));
    }

    public function verificationDocument(Request $request, int $documentId)
    {
        $profile = DB::table('provider_profiles')->where('user_id', $request->user()->id)->first();
        abort_unless($profile, 404);
        $document = DB::table('provider_verification_documents')->where('id', $documentId)->where('provider_profile_id', $profile->id)->first();
        abort_unless($document && Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download($document->path, $document->original_name, ['Cache-Control' => 'private, no-store']);
    }

    public function apply(Request $request): JsonResponse
    {
        abort_unless($this->settings->get('provider_applications_enabled', true), 503, 'Provider applications are temporarily unavailable.');
        $data = $request->validate([
            'displayName' => ['required', 'string', 'min:2', 'max:80'],
            'bio' => ['nullable', 'string', 'max:500'],
            'yearsExperience' => ['required', 'integer', 'between:0,70'],
            'verificationDocuments' => ['nullable', 'array', 'max:5'],
            'verificationDocuments.*' => ['file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        $userId = $request->user()->id;
        $stored = [];
        try {
            DB::transaction(function () use ($userId, $data, &$stored): void {
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();
                $profile = DB::table('provider_profiles')->where('user_id', $userId)->lockForUpdate()->first();
                abort_if($profile && $profile->status !== 'needs_changes', 409, 'A provider application already exists.');
                $attributes = ['display_name' => trim($data['displayName']), 'bio' => trim($data['bio'] ?? ''),
                    'years_experience' => $data['yearsExperience'], 'status' => 'pending', 'review_note' => null, 'updated_at' => now()];
                if ($profile) {
                    DB::table('provider_profiles')->where('id', $profile->id)->update($attributes);
                    $profileId = (int) $profile->id;
                    $oldDocuments = DB::table('provider_verification_documents')->where('provider_profile_id', $profileId)->pluck('path');
                    DB::table('provider_verification_documents')->where('provider_profile_id', $profileId)->delete();
                    DB::afterCommit(fn () => $oldDocuments->each(fn ($path) => Storage::disk('local')->delete($path)));
                } else {
                    $profileId = DB::table('provider_profiles')->insertGetId(['user_id' => $userId, ...$attributes, 'created_at' => now()]);
                }
                foreach ($data['verificationDocuments'] ?? [] as $document) {
                    $path = $document->store('provider-verification/'.$profileId, 'local');
                    $stored[] = $path;
                    DB::table('provider_verification_documents')->insert(['provider_profile_id' => $profileId, 'path' => $path,
                        'original_name' => mb_substr(basename($document->getClientOriginalName()), 0, 255), 'mime_type' => $document->getMimeType() ?: 'application/octet-stream',
                        'created_at' => now(), 'updated_at' => now()]);
                }
            });
        } catch (Throwable $exception) {
            foreach ($stored as $path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json($this->workspace->data($userId), 201);
    }

    public function categories(): JsonResponse
    {
        return response()->json(['data' => DB::table('service_categories')->where('is_active', true)->orderBy('name')->get()]);
    }

    public function areaOptions(): JsonResponse
    {
        $regions = DB::table('regions')->orderBy('name')->get();
        $provinces = DB::table('provinces')->orderBy('name')->get()->groupBy('region_code');
        $cities = DB::table('city_municipalities')->orderBy('name')->get()->groupBy('province_code');
        $options = [];
        foreach ($regions as $region) {
            foreach ($provinces->get($region->code, collect()) as $province) {
                $options[] = ['region' => $region->name, 'province' => $province->name,
                    'cities' => $cities->get($province->code, collect())->pluck('name')->all()];
            }
            $noProvince = DB::table('city_municipalities')->where('region_code', $region->code)->whereNull('province_code')->orderBy('name')->pluck('name')->all();
            if ($noProvince) {
                $options[] = ['region' => $region->name, 'province' => '', 'cities' => $noProvince];
            }
        }

        return response()->json($options);
    }

    public function areaBarangays(Request $request): JsonResponse
    {
        $data = $request->validate(['region' => ['required', 'string', 'max:160'], 'province' => ['nullable', 'string', 'max:160'], 'city' => ['required', 'string', 'max:160']]);
        $city = DB::table('city_municipalities as c')->join('regions as r', 'r.code', '=', 'c.region_code')
            ->leftJoin('provinces as p', 'p.code', '=', 'c.province_code')
            ->where('r.name', $data['region'])->where('p.name', filled($data['province'] ?? null) ? $data['province'] : null)
            ->where('c.name', $data['city'])->value('c.code');
        abort_unless($city, 404);

        return response()->json(DB::table('barangays')->where('city_municipality_code', $city)->orderBy('name')->pluck('name'));
    }

    public function accepting(Request $request): JsonResponse
    {
        $data = $request->validate(['accepting' => ['required', 'boolean']]);
        $profile = $this->workspace->approved($request->user()->id);
        if ($data['accepting'] && $profile->access_kind !== 'lifetime' && $this->workspace->completedCount($profile->id) >= $this->settings->get('free_successful_client_quota', 10)) {
            abort(409, 'Your free client quota is complete.');
        }
        if ($data['accepting']) {
            abort_unless(DB::table('provider_services')->where('provider_profile_id', $profile->id)->where('active', true)->exists()
                && DB::table('provider_service_areas')->where('provider_profile_id', $profile->id)->where('active', true)->exists(),
                409, 'Add an active service and service area before receiving requests.');
        }
        DB::table('provider_profiles')->where('id', $profile->id)->update(['accepting_requests' => $data['accepting'], 'updated_at' => now()]);

        return $this->workspace($request);
    }

    public function accept(Request $request, int $requestId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        DB::transaction(function () use ($profile, $requestId): void {
            DB::table('provider_profiles')->where('id', $profile->id)->lockForUpdate()->first();
            $item = DB::table('service_requests')->where('id', $requestId)->where('provider_profile_id', $profile->id)->lockForUpdate()->first();
            abort_unless($item, 404);
            abort_unless($item->status === 'new', 409, 'This request is no longer available.');
            DB::table('service_requests')->where('id', $requestId)->update(['status' => 'accepted', 'updated_at' => now()]);
            DB::table('provider_jobs')->insert(['service_request_id' => $requestId, 'provider_profile_id' => $profile->id,
                'customer_id' => $item->customer_id, 'status' => 'accepted', 'created_at' => now(), 'updated_at' => now()]);
            $this->workspace->notifyCustomer($item->customer_id, 'Request accepted', 'Your provider accepted your service request.');
            $this->conversations->note($item->customer_id, $profile->id, 'Request #'.$requestId.' accepted. You can now share contact details here.');
        });

        return $this->workspace($request);
    }

    public function decline(Request $request, int $requestId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        DB::transaction(function () use ($profile, $requestId): void {
            $item = DB::table('service_requests')->where('id', $requestId)->where('provider_profile_id', $profile->id)->lockForUpdate()->first();
            abort_unless($item, 404);
            abort_unless($item->status === 'new', 409, 'This request is no longer available.');
            DB::table('service_requests')->where('id', $requestId)->update(['status' => 'declined', 'updated_at' => now()]);
            $this->workspace->notifyCustomer($item->customer_id, 'Request declined', 'This provider is unavailable for your request.');
            $this->conversations->note($item->customer_id, $profile->id, 'Request #'.$requestId.' declined.');
        });

        return $this->workspace($request);
    }

    public function requestPhoto(Request $request, int $requestId, int $photoId)
    {
        $profile = $this->workspace->approved($request->user()->id);
        $photo = DB::table('service_request_photos as p')->join('service_requests as r', 'r.id', '=', 'p.service_request_id')
            ->where('p.id', $photoId)->where('r.id', $requestId)->where('r.provider_profile_id', $profile->id)->select('p.image_path')->first();
        abort_unless($photo, 404);
        abort_unless(Storage::disk('local')->exists($photo->image_path), 404);

        return Storage::disk('local')->response($photo->image_path, null, ['Cache-Control' => 'private, no-store']);
    }

    public function jobAction(Request $request, int $jobId, string $action): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $transitions = ['schedule' => ['accepted', 'scheduled'], 'start' => ['scheduled', 'in_progress'], 'finish' => ['in_progress', 'provider_finished']];
        abort_unless(isset($transitions[$action]), 404);
        $data = $action === 'schedule' ? $request->validate(['scheduledAt' => ['required', 'date', 'after:now']]) : [];
        DB::transaction(function () use ($jobId, $profile, $action, $transitions, $data): void {
            $job = DB::table('provider_jobs')->where('id', $jobId)->where('provider_profile_id', $profile->id)->lockForUpdate()->first();
            abort_unless($job, 404);
            abort_unless($job->status === $transitions[$action][0], 409, 'This job cannot move to that step.');
            DB::table('provider_jobs')->where('id', $jobId)->update(array_filter([
                'status' => $transitions[$action][1], 'scheduled_at' => $data['scheduledAt'] ?? null, 'updated_at' => now(),
            ], fn ($value) => $value !== null));
            if ($action === 'finish') {
                $this->workspace->notify($profile->id, 'Work marked finished', 'Waiting for the customer to confirm completion.', '/provider/jobs/'.$jobId);
            }
            $this->workspace->notifyCustomer($job->customer_id,
                ['schedule' => 'Visit scheduled', 'start' => 'Work started', 'finish' => 'Work finished'][$action],
                ['schedule' => 'Your provider scheduled the visit.', 'start' => 'Your provider started the service.', 'finish' => 'Please confirm the completed work in My requests.'][$action]);
            $this->conversations->note($job->customer_id, $profile->id, 'Request #'.$job->service_request_id.': '
                .['schedule' => 'visit scheduled.', 'start' => 'work started.', 'finish' => 'work marked finished. Waiting for the customer to confirm.'][$action]);
        });

        return $this->workspace($request);
    }

    public function saveService(Request $request, ?int $serviceId = null): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $data = $request->validate(['category' => ['required', 'string', Rule::exists('service_categories', 'name')], 'description' => ['nullable', 'string', 'max:240']]);
        $categoryId = DB::table('service_categories')->where('name', $data['category'])->value('id');
        if ($serviceId) {
            $service = DB::table('provider_services')->where('id', $serviceId)->where('provider_profile_id', $profile->id)->first();
            abort_unless($service, 404);
            if ($service->service_category_id != $categoryId && DB::table('provider_services')->where('provider_profile_id', $profile->id)->where('service_category_id', $categoryId)->exists()) {
                throw ValidationException::withMessages(['category' => 'This service is already listed.']);
            }
            $categoryChanged = (int) $service->service_category_id !== (int) $categoryId;
            DB::table('provider_services')->where('id', $serviceId)->update([
                'service_category_id' => $categoryId, 'description' => trim($data['description'] ?? ''), 'updated_at' => now(),
                ...($categoryChanged && $service->cover_path ? ['cover_status' => 'pending', 'cover_review_note' => null, 'cover_submitted_at' => now(), 'cover_reviewed_at' => null] : []),
            ]);
        } else {
            abort_if(DB::table('provider_services')->where('provider_profile_id', $profile->id)->where('service_category_id', $categoryId)->exists(), 409, 'This service is already listed.');
            DB::table('provider_services')->insert(['provider_profile_id' => $profile->id, 'service_category_id' => $categoryId,
                'description' => trim($data['description'] ?? ''), 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        }

        return $this->workspace($request);
    }

    public function toggleService(Request $request, int $serviceId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $service = DB::table('provider_services')->where('id', $serviceId)->where('provider_profile_id', $profile->id)->first();
        abort_unless($service, 404);
        DB::table('provider_services')->where('id', $serviceId)->update(['active' => ! $service->active, 'updated_at' => now()]);
        if ($service->active && ! DB::table('provider_services')->where('provider_profile_id', $profile->id)->where('active', true)->exists()) {
            DB::table('provider_profiles')->where('id', $profile->id)->update(['accepting_requests' => false, 'updated_at' => now()]);
        }

        return $this->workspace($request);
    }

    /**
     * Uploads a new cover for one of the provider's services. Every new image waits for review before it reaches customers.
     */
    public function uploadServiceCover(Request $request, int $serviceId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $service = $this->ownedService($profile->id, $serviceId);
        $data = $request->validate([
            'cover' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120', 'dimensions:min_width=1000,min_height=600'],
            ...$this->coverLayoutRules(),
        ], [
            'cover.dimensions' => 'Use an image at least 1000 × 600 pixels so it stays sharp on the Home page.',
            'cover.max' => 'Use an image smaller than 5 MB.',
        ]);
        $path = $this->images->store($data['cover'], 'providers/'.$profile->id.'/services', 'cover');
        DB::table('provider_services')->where('id', $service->id)->update([
            'cover_path' => $path, 'cover_status' => 'pending', 'cover_review_note' => null,
            'cover_fit' => $data['fit'], 'cover_focus_x' => $data['focusX'], 'cover_focus_y' => $data['focusY'],
            'cover_submitted_at' => now(), 'cover_reviewed_at' => null, 'updated_at' => now(),
        ]);
        if ($service->cover_path) {
            Storage::disk('public')->delete($service->cover_path);
        }

        return $this->workspace($request);
    }

    /**
     * Repositions the current cover. The image itself is unchanged, so its review status stays as it is.
     */
    public function updateServiceCover(Request $request, int $serviceId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $service = $this->ownedService($profile->id, $serviceId);
        abort_unless($service->cover_path, 404, 'This service has no cover yet.');
        $data = $request->validate($this->coverLayoutRules());
        DB::table('provider_services')->where('id', $service->id)->update([
            'cover_fit' => $data['fit'], 'cover_focus_x' => $data['focusX'], 'cover_focus_y' => $data['focusY'], 'updated_at' => now(),
        ]);

        return $this->workspace($request);
    }

    public function removeServiceCover(Request $request, int $serviceId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $service = $this->ownedService($profile->id, $serviceId);
        DB::table('provider_services')->where('id', $service->id)->update([
            'cover_path' => null, 'cover_status' => null, 'cover_review_note' => null, 'cover_fit' => 'cover',
            'cover_focus_x' => 50, 'cover_focus_y' => 50, 'cover_submitted_at' => null, 'cover_reviewed_at' => null, 'updated_at' => now(),
        ]);
        if ($service->cover_path) {
            Storage::disk('public')->delete($service->cover_path);
        }

        return $this->workspace($request);
    }

    private function ownedService(int $profileId, int $serviceId): object
    {
        $service = DB::table('provider_services')->where('id', $serviceId)->where('provider_profile_id', $profileId)->where('is_visible', true)->first();
        abort_unless($service, 404);

        return $service;
    }

    /** @return array<string, array<int, mixed>> */
    private function coverLayoutRules(): array
    {
        return [
            'fit' => ['required', Rule::in(['cover', 'contain'])],
            'focusX' => ['required', 'integer', 'between:0,100'],
            'focusY' => ['required', 'integer', 'between:0,100'],
        ];
    }

    public function addArea(Request $request): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $data = $request->validate(['region' => ['required', 'string', 'max:160'], 'province' => ['nullable', 'string', 'max:160'],
            'city' => ['required', 'string', 'max:160'], 'barangay' => ['nullable', 'string', 'max:160']]);
        $region = DB::table('regions')->where('name', $data['region'])->first();
        if (! $region) {
            throw ValidationException::withMessages(['region' => 'Choose a valid region.']);
        }
        $province = filled($data['province'] ?? null) ? DB::table('provinces')->where('region_code', $region->code)->where('name', $data['province'])->first() : null;
        if (filled($data['province'] ?? null) && ! $province) {
            throw ValidationException::withMessages(['province' => 'Choose a valid province.']);
        }
        $city = DB::table('city_municipalities')->where('region_code', $region->code)->where('province_code', $province?->code)->where('name', $data['city'])->first();
        if (! $city) {
            throw ValidationException::withMessages(['city' => 'Choose a valid city or municipality.']);
        }
        $barangay = filled($data['barangay'] ?? null) ? DB::table('barangays')->where('city_municipality_code', $city->code)->where('name', $data['barangay'])->first() : null;
        if (filled($data['barangay'] ?? null) && ! $barangay) {
            throw ValidationException::withMessages(['barangay' => 'Choose a valid barangay.']);
        }
        abort_if(DB::table('provider_service_areas')->where('provider_profile_id', $profile->id)->where('city_municipality_code', $city->code)->where('barangay_code', $barangay?->code)->exists(), 409, 'This service area is already listed.');
        DB::table('provider_service_areas')->insert(['provider_profile_id' => $profile->id, 'region_code' => $region->code,
            'province_code' => $province?->code, 'city_municipality_code' => $city->code, 'barangay_code' => $barangay?->code,
            'active' => true, 'created_at' => now(), 'updated_at' => now()]);

        return $this->workspace($request);
    }

    public function removeArea(Request $request, int $areaId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        abort_unless(DB::table('provider_service_areas')->where('id', $areaId)->where('provider_profile_id', $profile->id)->delete(), 404);
        if (! DB::table('provider_service_areas')->where('provider_profile_id', $profile->id)->where('active', true)->exists()) {
            DB::table('provider_profiles')->where('id', $profile->id)->update(['accepting_requests' => false, 'updated_at' => now()]);
        }

        return $this->workspace($request);
    }

    public function saveProfile(Request $request): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $data = $request->validate(['displayName' => ['required', 'string', 'min:2', 'max:80'], 'bio' => ['nullable', 'string', 'max:500'],
            'yearsExperience' => ['required', 'integer', 'between:0,70']]);
        DB::table('provider_profiles')->where('id', $profile->id)->update(['display_name' => trim($data['displayName']),
            'bio' => trim($data['bio'] ?? ''), 'years_experience' => $data['yearsExperience'], 'updated_at' => now()]);

        return $this->workspace($request);
    }

    public function profilePhoto(Request $request): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $data = $request->validate(['photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120']]);
        $path = $this->images->store($data['photo'], 'providers/'.$profile->id.'/profile', 'photo', 1200, 1200);
        DB::table('provider_profiles')->where('id', $profile->id)->update(['photo_path' => $path, 'updated_at' => now()]);
        if ($profile->photo_path) {
            Storage::disk('public')->delete($profile->photo_path);
        }

        return $this->workspace($request);
    }

    public function addPortfolio(Request $request): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $data = $request->validate(['title' => ['required', 'string', 'max:70'], 'category' => ['required', 'string', 'max:50'],
            'image' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:5120']]);
        abort_if(DB::table('provider_portfolio_items')->where('provider_profile_id', $profile->id)->count() >= 20, 409, 'You can upload up to 20 work samples.');
        $path = $this->images->store($data['image'], 'providers/'.$profile->id.'/portfolio', 'image');
        DB::table('provider_portfolio_items')->insert(['provider_profile_id' => $profile->id, 'title' => trim($data['title']),
            'category' => trim($data['category']), 'image_path' => $path, 'created_at' => now(), 'updated_at' => now()]);

        return $this->workspace($request);
    }

    public function removePortfolio(Request $request, int $itemId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        $item = DB::table('provider_portfolio_items')->where('id', $itemId)->where('provider_profile_id', $profile->id)->first();
        abort_unless($item, 404);
        DB::table('provider_portfolio_items')->where('id', $itemId)->delete();
        Storage::disk('public')->delete($item->image_path);

        return $this->workspace($request);
    }

    public function readNotification(Request $request, int $noteId): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        abort_unless(DB::table('provider_notifications')->where('id', $noteId)->where('provider_profile_id', $profile->id)->update(['read_at' => now(), 'updated_at' => now()]), 404);

        return $this->workspace($request);
    }

    public function readAllNotifications(Request $request): JsonResponse
    {
        $profile = $this->workspace->approved($request->user()->id);
        DB::table('provider_notifications')->where('provider_profile_id', $profile->id)->whereNull('read_at')->update(['read_at' => now(), 'updated_at' => now()]);

        return $this->workspace($request);
    }
}
