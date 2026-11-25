<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ProviderWorkspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class NotificationTabsTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    public function test_each_notification_lands_in_the_right_tab(): void
    {
        foreach ([
            '/provider/requests/12' => 'request', '/provider/jobs/4' => 'request', '/provider/reviews' => 'request',
            '/my-requests' => 'request', '/my-requests#request-12' => 'request',
            '/provider/messages/3' => 'inbox', '/messages/3' => 'inbox',
            '/provider/notifications' => 'notice', '/provider/access' => 'notice', '/provider/services' => 'notice',
            '/provider' => 'notice', '/home' => 'notice',
            // Lookalike paths must not sneak into a tab.
            '/provider/requestsfoo' => 'notice', '/messagesx' => 'notice',
        ] as $href => $category) {
            $this->assertSame($category, ProviderWorkspace::category($href), $href);
        }
    }

    public function test_a_finished_job_asks_the_customer_to_confirm_it_and_links_to_the_request(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create();
        $locationId = (int) $this->actingAs($customer)->postJson('/api/me/service-locations', [
            'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009', 'address_line' => '26 Jesus Street', 'is_default' => true,
        ])->assertCreated()->json('data.id');
        $requestId = (int) $this->actingAs($customer)->postJson('/api/customer/requests', [
            'providerId' => $providerId, 'category' => 'electrical', 'serviceLocationId' => $locationId,
            'description' => 'Outlet in the kitchen sparks when used.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ])->assertCreated()->json('id');

        // The provider's own list sorts the new request into Requests.
        $this->actingAs($providerUser)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('notifications.0.title', 'New customer request')->assertJsonPath('notifications.0.category', 'request');

        $jobId = (int) $this->actingAs($providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk()->json('jobs.0.id');
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/schedule", ['scheduledAt' => now()->addDays(2)->toIso8601String()])->assertOk();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/start")->assertOk();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/finish")->assertOk();

        $this->actingAs($customer)->getJson('/api/customer/notifications')->assertOk()
            ->assertJsonPath('data.0.title', 'Confirm the finished work')
            ->assertJsonPath('data.0.description', 'Juan Electrical Works finished your electrical job. Check the work, then confirm it.')
            ->assertJsonPath('data.0.href', "/my-requests#request-{$requestId}")
            ->assertJsonPath('data.0.category', 'request');
    }
}
