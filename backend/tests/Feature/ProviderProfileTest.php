<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class ProviderProfileTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private int $providerId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedMarketplaceReferenceData();
        $this->providerId = $this->approvedProvider(User::factory()->create());
    }

    public function test_profile_shows_earned_achievements_rating_breakdown_and_jobs_per_service(): void
    {
        $maria = User::factory()->create(['name' => 'Maria Santos']);
        $jose = User::factory()->create(['name' => 'Jose Rizal']);
        $ana = User::factory()->create(['name' => 'Ana Cruz']);
        foreach ([[$maria, 5], [$maria, 5], [$jose, 4], [$jose, 5], [$ana, 5]] as [$customer, $rating]) {
            $this->completedJob($customer, $rating);
        }

        $this->getJson("/api/providers/{$this->providerId}")->assertOk()
            ->assertJsonPath('data.rating', 4.8)
            ->assertJsonPath('data.completedServices', 5)
            ->assertJsonPath('data.repeatCustomers', 2)
            ->assertJsonPath('data.ratingBreakdown.0', ['stars' => 5, 'count' => 4])
            ->assertJsonPath('data.ratingBreakdown.1', ['stars' => 4, 'count' => 1])
            ->assertJsonPath('data.services.0.completedJobs', 5)
            ->assertJsonPath('data.achievements.*.key', ['top_rated', 'jobs_milestone', 'repeat_customers', 'experienced'])
            ->assertJsonPath('data.achievements.1.title', '5+ jobs completed')
            ->assertJsonPath('data.reviews.hasMore', false)
            ->assertJsonCount(5, 'data.reviews.data');
    }

    public function test_new_provider_only_shows_achievements_that_do_not_need_completed_work(): void
    {
        $this->getJson("/api/providers/{$this->providerId}")->assertOk()
            ->assertJsonPath('data.rating', null)
            ->assertJsonPath('data.achievements.*.key', ['experienced'])
            ->assertJsonPath('data.reviews', ['data' => [], 'hasMore' => false]);
    }

    public function test_reviews_endpoint_filters_by_stars_and_continues_before_the_last_review(): void
    {
        $customer = User::factory()->create(['name' => 'Maria Santos', 'email' => 'maria@example.test']);
        foreach ([5, 4, 5, 5, 3, 5, 5] as $rating) {
            $this->completedJob($customer, $rating);
        }

        $first = $this->getJson("/api/providers/{$this->providerId}/reviews")->assertOk()
            ->assertJsonCount(5, 'data')->assertJsonPath('hasMore', true)->assertJsonPath('data.0.customerName', 'Maria')
            ->assertDontSee('maria@example.test');
        $this->getJson("/api/providers/{$this->providerId}/reviews?before=".$first->json('data.4.id'))->assertOk()
            ->assertJsonCount(2, 'data')->assertJsonPath('hasMore', false);
        $this->getJson("/api/providers/{$this->providerId}/reviews?rating=4")->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.rating', 4);
        $this->getJson("/api/providers/{$this->providerId}/reviews?rating=9")->assertUnprocessable();
    }

    public function test_reviews_endpoint_returns_404_for_a_provider_who_is_not_approved(): void
    {
        DB::table('provider_profiles')->where('id', $this->providerId)->update(['status' => 'suspended']);

        $this->getJson("/api/providers/{$this->providerId}/reviews")->assertNotFound();
    }

    private function completedJob(User $customer, int $rating): void
    {
        $now = now();
        $locationId = DB::table('service_locations')->where('user_id', $customer->id)->value('id')
            ?? $this->actingAs($customer)->postJson('/api/me/service-locations', [
                'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
                'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009',
                'address_line' => '26 Jesus Street', 'is_default' => true,
            ])->assertCreated()->json('data.id');
        $requestId = DB::table('service_requests')->insertGetId([
            'customer_id' => $customer->id, 'provider_profile_id' => $this->providerId,
            'service_category_id' => DB::table('service_categories')->where('slug', 'electrical')->value('id'),
            'service_location_id' => $locationId, 'description' => 'Outlet repair.', 'preferred_at' => $now,
            'status' => 'completed', 'created_at' => $now, 'updated_at' => $now,
        ]);
        $jobId = DB::table('provider_jobs')->insertGetId([
            'service_request_id' => $requestId, 'provider_profile_id' => $this->providerId, 'customer_id' => $customer->id,
            'status' => 'completed', 'completed_at' => $now, 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('provider_reviews')->insert([
            'provider_job_id' => $jobId, 'provider_profile_id' => $this->providerId, 'customer_id' => $customer->id,
            'rating' => $rating, 'comment' => 'Neat work.', 'created_at' => $now, 'updated_at' => $now,
        ]);
    }
}
