<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class JobRescheduleTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private User $customer;

    private User $providerUser;

    private int $jobId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedMarketplaceReferenceData();
        $this->providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($this->providerUser);
        $this->customer = User::factory()->create();
        $locationId = (int) $this->actingAs($this->customer)->postJson('/api/me/service-locations', [
            'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009', 'address_line' => '26 Jesus Street', 'is_default' => true,
        ])->assertCreated()->json('data.id');
        $requestId = (int) $this->actingAs($this->customer)->postJson('/api/customer/requests', [
            'providerId' => $providerId, 'category' => 'electrical', 'serviceLocationId' => $locationId,
            'description' => 'Outlet in the kitchen sparks when used.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ])->assertCreated()->json('id');
        $this->jobId = (int) $this->actingAs($this->providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk()->json('jobs.0.id');
        $this->actingAs($this->providerUser)->postJson("/api/provider/jobs/{$this->jobId}/schedule", ['scheduledAt' => now()->addDays(2)->setTime(9, 0)->toIso8601String()])->assertOk();
    }

    public function test_customer_asks_for_a_new_time_and_the_provider_accepts_it(): void
    {
        $newTime = now()->addDays(4)->setTime(14, 0);
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule", ['proposedAt' => $newTime->toIso8601String(), 'reason' => 'I will be out of town.'])
            ->assertCreated();

        // The old time still stands while the provider decides, and both sides can see the open request.
        $this->assertTrue(now()->addDays(2)->setTime(9, 0)->equalTo(DB::table('provider_jobs')->where('id', $this->jobId)->value('scheduled_at')));
        $this->actingAs($this->customer)->getJson('/api/customer/requests')->assertOk()
            ->assertJsonPath('data.0.reschedule_by', 'customer')
            ->assertJsonPath('data.0.reschedule_reason', 'I will be out of town.');
        $this->actingAs($this->providerUser)->getJson('/api/provider/workspace')->assertOk()
            ->assertJsonPath('jobs.0.reschedule.requestedBy', 'customer');

        // Only one open request, and the asker cannot accept their own.
        $this->actingAs($this->providerUser)->postJson("/api/provider/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->addDays(5)->toIso8601String()])->assertConflict();
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule/accept")->assertForbidden();

        $this->actingAs($this->providerUser)->postJson("/api/provider/jobs/{$this->jobId}/reschedule/accept")->assertOk()
            ->assertJsonPath('jobs.0.reschedule', null);
        $this->assertTrue($newTime->equalTo(DB::table('provider_jobs')->where('id', $this->jobId)->value('scheduled_at')));
        $this->assertDatabaseHas('job_reschedule_requests', ['provider_job_id' => $this->jobId, 'status' => 'accepted', 'requested_by' => 'customer']);
        $this->assertDatabaseHas('customer_notifications', ['customer_id' => $this->customer->id, 'title' => 'New visit time agreed']);
    }

    public function test_provider_asks_and_the_customer_declines_so_the_old_time_stays(): void
    {
        $original = DB::table('provider_jobs')->where('id', $this->jobId)->value('scheduled_at');
        $this->actingAs($this->providerUser)->postJson("/api/provider/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->addDays(3)->toIso8601String()])->assertCreated();
        $this->assertDatabaseHas('customer_notifications', ['customer_id' => $this->customer->id, 'title' => 'New visit time requested']);

        $this->actingAs($this->providerUser)->postJson("/api/provider/jobs/{$this->jobId}/reschedule/decline")->assertForbidden();
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule/decline")->assertOk();

        $this->assertSame($original, DB::table('provider_jobs')->where('id', $this->jobId)->value('scheduled_at'));
        $this->assertDatabaseHas('job_reschedule_requests', ['provider_job_id' => $this->jobId, 'status' => 'declined']);
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule/accept")->assertConflict();
    }

    public function test_the_asker_can_withdraw_and_starting_work_closes_an_open_request(): void
    {
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->addDays(3)->toIso8601String()])->assertCreated();
        $this->actingAs($this->providerUser)->postJson("/api/provider/jobs/{$this->jobId}/reschedule/withdraw")->assertForbidden();
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule/withdraw")->assertOk();
        $this->assertDatabaseHas('job_reschedule_requests', ['provider_job_id' => $this->jobId, 'status' => 'withdrawn']);

        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->addDays(3)->toIso8601String()])->assertCreated();
        $this->actingAs($this->providerUser)->postJson("/api/provider/jobs/{$this->jobId}/start")->assertOk();
        $this->assertDatabaseHas('job_reschedule_requests', ['provider_job_id' => $this->jobId, 'status' => 'cancelled']);
        $this->assertDatabaseMissing('job_reschedule_requests', ['provider_job_id' => $this->jobId, 'status' => 'pending']);

        // Once work has started, nobody can move the visit.
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->addDays(4)->toIso8601String()])->assertConflict();
    }

    public function test_requests_are_checked_for_ownership_and_a_future_time(): void
    {
        $stranger = User::factory()->create();
        $this->actingAs($stranger)->postJson("/api/customer/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->addDays(3)->toIso8601String()])->assertNotFound();
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->subHour()->toIso8601String()])->assertUnprocessable();
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule", ['proposedAt' => now()->addDays(3)->toIso8601String(), 'reason' => str_repeat('a', 241)])
            ->assertUnprocessable();
        $this->actingAs($this->customer)->postJson("/api/customer/jobs/{$this->jobId}/reschedule/maybe")->assertNotFound();
        $this->assertDatabaseCount('job_reschedule_requests', 0);
    }
}
