<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GateStats;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class GateStatsTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    /** @var array<string, mixed> a real request's links (customer, provider, service, address), copied into each test row */
    private array $template;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-17 02:00:00'));
        $this->seedMarketplaceReferenceData();
        $providerId = $this->approvedProvider(User::factory()->create());
        $customer = User::factory()->create();
        $locationId = (int) $this->actingAs($customer)->postJson('/api/me/service-locations', [
            'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009', 'address_line' => '26 Jesus Street', 'is_default' => true,
        ])->assertCreated()->json('data.id');
        $requestId = (int) $this->actingAs($customer)->postJson('/api/customer/requests', [
            'providerId' => $providerId, 'category' => 'electrical', 'serviceLocationId' => $locationId,
            'description' => 'Outlet in the kitchen sparks when used.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ])->assertCreated()->json('id');
        $this->template = (array) DB::table('service_requests')->where('id', $requestId)
            ->first(['customer_id', 'provider_profile_id', 'service_category_id', 'service_location_id', 'description', 'notes', 'preferred_at']);
        // Each test builds its own history from here.
        DB::table('service_requests')->delete();
    }

    /**
     * A request sent `$daysAgo` days ago, accepted after `$acceptMinutes` (or still waiting), optionally a repeat booking.
     */
    private function request(float $daysAgo, ?int $acceptMinutes, bool $repeat = false): void
    {
        $sent = now()->subMinutes((int) round($daysAgo * 24 * 60));
        $id = DB::table('service_requests')->insertGetId([...$this->template, 'status' => $acceptMinutes === null ? 'new' : 'accepted',
            'repeat_of_request_id' => $repeat ? DB::table('service_requests')->min('id') : null, 'created_at' => $sent, 'updated_at' => $sent]);
        if ($acceptMinutes !== null) {
            DB::table('provider_jobs')->insert(['service_request_id' => $id, 'provider_profile_id' => $this->template['provider_profile_id'],
                'customer_id' => $this->template['customer_id'], 'status' => 'accepted',
                'created_at' => $sent->copy()->addMinutes($acceptMinutes), 'updated_at' => $sent->copy()->addMinutes($acceptMinutes)]);
        }
    }

    public function test_the_last_30_days_are_compared_with_the_30_days_before(): void
    {
        // Days 31–60 ago: no repeat bookings, every request accepted after two hours.
        foreach ([35, 40, 45, 50, 55] as $day) {
            $this->request($day, 120);
        }
        // Last 30 days: 2 of 5 are repeat bookings, and acceptance got faster (one slow outlier).
        $this->request(20, 30);
        $this->request(15, 30, repeat: true);
        $this->request(10, 45);
        $this->request(5, 60, repeat: true);
        $this->request(2, 600);

        $gate = app(GateStats::class)->summary();

        $this->assertSame(['requests' => 5, 'repeats' => 2, 'rate' => 40.0, 'previousRate' => 0.0, 'trend' => 'better'], $gate['repeatBookings']);
        // The median ignores the 10-hour outlier that an average (153 min) would make look slower than before.
        $this->assertSame(['accepted' => 5, 'medianMinutes' => 45, 'previousMedianMinutes' => 120, 'waiting' => 0, 'trend' => 'better'], $gate['acceptSpeed']);
    }

    public function test_slower_acceptance_and_fewer_repeats_show_as_worse(): void
    {
        foreach ([35, 40, 45, 50] as $day) {
            $this->request($day, 20, repeat: true);
        }
        $this->request(55, 20);
        foreach ([3, 6, 9, 12, 15] as $day) {
            $this->request($day, 240);
        }

        $gate = app(GateStats::class)->summary();

        $this->assertSame('worse', $gate['repeatBookings']['trend']);
        $this->assertSame('worse', $gate['acceptSpeed']['trend']);
    }

    public function test_no_trend_is_claimed_from_too_little_data(): void
    {
        $this->request(40, 60);
        $this->request(10, 15, repeat: true);
        $this->request(5, null);
        // A request still waiting, sent long ago, counts as waiting whatever its age.
        $this->request(45, null);

        $gate = app(GateStats::class)->summary();

        $this->assertSame(['requests' => 2, 'repeats' => 1, 'rate' => 50.0, 'previousRate' => 0.0, 'trend' => null], $gate['repeatBookings']);
        $this->assertSame(['accepted' => 1, 'medianMinutes' => 15, 'previousMedianMinutes' => 60, 'waiting' => 2, 'trend' => null], $gate['acceptSpeed']);
    }

    public function test_an_empty_platform_shows_no_numbers_rather_than_zeros(): void
    {
        $gate = app(GateStats::class)->summary();

        $this->assertNull($gate['repeatBookings']['rate']);
        $this->assertNull($gate['acceptSpeed']['medianMinutes']);
        $this->assertNull($gate['acceptSpeed']['trend']);
    }

    public function test_the_admin_dashboard_includes_the_gate_and_others_cannot_see_it(): void
    {
        $this->request(3, 30);

        $this->actingAs($this->admin())->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonPath('data.gate.days', 30)
            ->assertJsonPath('data.gate.acceptSpeed.medianMinutes', 30);
        $this->actingAs(User::factory()->create())->getJson('/api/admin/dashboard')->assertForbidden();
    }
}
