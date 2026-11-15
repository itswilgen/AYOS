<?php

namespace App\Services;

use App\Models\ServiceLocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * "Download my data" (Data Privacy Act right of access and portability): everything AYOS holds about one account,
 * in plain JSON. Never includes the password hash, two-step secrets, recovery codes, or other people's contact details.
 */
class AccountData
{
    /** Security events are capped so a long-lived account still exports quickly. */
    private const SECURITY_EVENTS = 500;

    /**
     * @return array<string, mixed>
     */
    public function export(User $user): array
    {
        $providerId = DB::table('provider_profiles')->where('user_id', $user->id)->value('id');

        return [
            'exported_at' => now()->toIso8601String(),
            'account' => [
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $user->mobile_number,
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                'created_at' => $user->created_at?->toIso8601String(),
                'terms_accepted_at' => $user->terms_accepted_at ? (string) $user->terms_accepted_at : null,
                'signed_in_with_google' => $user->google_id !== null,
                'two_step_verification' => $user->hasEnabledTwoFactorAuthentication(),
                'display_name' => DB::table('user_profiles')->where('user_id', $user->id)->value('display_name'),
            ],
            'addresses' => $this->addresses($user),
            'service_requests' => $this->requests($user),
            'reviews_written' => DB::table('provider_reviews as rv')
                ->join('provider_profiles as p', 'p.id', '=', 'rv.provider_profile_id')
                ->where('rv.customer_id', $user->id)->orderBy('rv.id')
                ->get(['p.display_name as provider', 'rv.rating', 'rv.comment', 'rv.created_at'])->all(),
            'messages_sent' => DB::table('conversation_messages')->where('sender_id', $user->id)->orderBy('id')
                ->get(['conversation_id', 'body', 'created_at', DB::raw('image_path IS NOT NULL as had_photo')])->all(),
            'notifications' => DB::table('customer_notifications')->where('customer_id', $user->id)->orderBy('id')
                ->get(['title', 'detail', 'read_at', 'created_at'])->all(),
            'disputes_opened' => DB::table('service_disputes')->where('opened_by', $user->id)->orderBy('id')
                ->get(['provider_job_id', 'reason', 'description', 'status', 'resolution_note', 'created_at'])->all(),
            'reports_filed' => DB::table('content_reports')->where('reporter_id', $user->id)->orderBy('id')
                ->get(['target_type', 'reason', 'details', 'status', 'created_at'])->all(),
            'provider' => $providerId ? $this->provider((int) $providerId) : null,
            'security_events' => DB::table('security_audits')->where('user_id', $user->id)->orderByDesc('id')
                ->limit(self::SECURITY_EVENTS)->get(['event_type', 'ip_address', 'user_agent', 'created_at'])->all(),
        ];
    }

    /** The user's own addresses, decrypted: they are the person's data. */
    private function addresses(User $user): array
    {
        return ServiceLocation::query()->where('user_id', $user->id)
            ->with(['region', 'province', 'cityMunicipality', 'barangay'])->orderBy('id')->get()
            ->map(fn (ServiceLocation $location): array => [
                'label' => $location->label,
                'address_line' => $location->address_line,
                'landmark' => $location->landmark,
                'postal_code' => $location->postal_code,
                'barangay' => $location->barangay?->name,
                'city_municipality' => $location->cityMunicipality?->name,
                'province' => $location->province?->name,
                'region' => $location->region?->name,
                'is_default' => (bool) $location->is_default,
            ])->all();
    }

    private function requests(User $user): array
    {
        return DB::table('service_requests as r')
            ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
            ->join('provider_profiles as p', 'p.id', '=', 'r.provider_profile_id')
            ->leftJoin('provider_jobs as j', 'j.service_request_id', '=', 'r.id')
            ->where('r.customer_id', $user->id)->orderBy('r.id')
            ->get(['r.id', 'c.name as service', 'p.display_name as provider', 'r.description', 'r.notes', 'r.preferred_at',
                'r.status as request_status', 'j.status as job_status', 'j.scheduled_at', 'j.completed_at', 'r.created_at'])
            ->all();
    }

    /** The provider side. Customers appear by first name only, as they do in the provider workspace before acceptance. */
    private function provider(int $profileId): array
    {
        $profile = DB::table('provider_profiles')->where('id', $profileId)
            ->first(['display_name', 'bio', 'years_experience', 'status', 'verified', 'accepting_requests', 'access_kind', 'approved_at', 'created_at']);

        return [
            'profile' => $profile,
            'services' => DB::table('provider_services as s')->join('service_categories as c', 'c.id', '=', 's.service_category_id')
                ->where('s.provider_profile_id', $profileId)->orderBy('c.name')->get(['c.name as service', 's.description', 's.active'])->all(),
            'service_areas' => DB::table('provider_service_areas as a')->join('city_municipalities as city', 'city.code', '=', 'a.city_municipality_code')
                ->leftJoin('barangays as b', 'b.code', '=', 'a.barangay_code')->where('a.provider_profile_id', $profileId)
                ->get(['city.name as city_municipality', 'b.name as barangay', 'a.active'])->all(),
            'portfolio' => DB::table('provider_portfolio_items')->where('provider_profile_id', $profileId)->orderBy('id')
                ->get(['title', 'category', 'created_at'])->all(),
            'verification_documents' => DB::table('provider_verification_documents')->where('provider_profile_id', $profileId)
                ->orderBy('id')->get(['original_name', 'mime_type', 'created_at'])->all(),
            'jobs' => DB::table('provider_jobs as j')
                ->join('service_requests as r', 'r.id', '=', 'j.service_request_id')
                ->join('service_categories as c', 'c.id', '=', 'r.service_category_id')
                ->join('users as u', 'u.id', '=', 'j.customer_id')
                ->where('j.provider_profile_id', $profileId)->orderBy('j.id')
                ->get(['c.name as service', 'u.name as customer_name', 'j.status', 'j.scheduled_at', 'j.completed_at', 'j.created_at'])
                ->map(fn (object $job): array => [...(array) $job, 'customer_name' => explode(' ', trim((string) $job->customer_name))[0]])
                ->all(),
            'reviews_received' => DB::table('provider_reviews')->where('provider_profile_id', $profileId)->orderBy('id')
                ->get(['rating', 'comment', 'created_at'])->all(),
            'activation_payments' => DB::table('activation_payments')->where('provider_profile_id', $profileId)->orderBy('id')
                ->get(['amount', 'currency', 'reference', 'method', 'status', 'created_at'])->all(),
        ];
    }
}
