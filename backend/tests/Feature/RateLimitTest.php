<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * The general API limits: 60 requests a minute for a signed-out visitor (per IP), 120 for a signed-in person
 * (per account, so people sharing one Wi-Fi don't block each other), 30 searches and 20 messages a minute.
 * The stricter limits on sign-in, 2FA, reports and so on stay as they were.
 */
class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_signed_out_visitor_gets_60_requests_a_minute_then_a_429_with_a_wait_time(): void
    {
        for ($i = 1; $i <= 60; $i++) {
            $this->getJson('/api/platform-state')->assertOk();
        }

        $this->getJson('/api/platform-state')->assertTooManyRequests()->assertHeader('Retry-After');
    }

    public function test_a_signed_in_person_has_their_own_120_a_minute_so_others_on_the_same_wifi_are_not_blocked(): void
    {
        [$lea, $jun] = User::factory()->count(2)->create();

        for ($i = 1; $i <= 120; $i++) {
            $this->actingAs($lea)->getJson('/api/user')->assertOk();
        }
        $this->actingAs($lea)->getJson('/api/user')->assertTooManyRequests();

        // Same IP, different account: still fine.
        $this->actingAs($jun)->getJson('/api/user')->assertOk();
    }

    public function test_search_allows_30_a_minute(): void
    {
        for ($i = 1; $i <= 30; $i++) {
            $this->getJson('/api/providers')->assertOk();
        }

        $this->getJson('/api/providers')->assertTooManyRequests();
    }

    public function test_sending_messages_is_limited_to_20_a_minute_per_person(): void
    {
        foreach (['customer', 'provider'] as $side) {
            $route = Route::getRoutes()->getByName("{$side}.conversations.send");
            $this->assertNotNull($route, "No send-message route for the {$side}");
            $this->assertContains('throttle:messages', $route->gatherMiddleware(), "{$side} send route");
        }

        $limit = app(RateLimiter::class)->limiter('messages')(request()->setUserResolver(fn () => User::factory()->make(['id' => 7])));
        $this->assertSame(20, $limit->maxAttempts);
        $this->assertSame('messages:user:7', $limit->key);
    }

    public function test_the_payment_webhook_is_not_caught_by_the_general_limit(): void
    {
        // PayMongo can send bursts from one IP; it keeps its own, higher limit (120 a minute).
        for ($i = 1; $i <= 70; $i++) {
            $this->assertNotSame(429, $this->postJson('/api/webhooks/paymongo', [])->status(), "request {$i}");
        }
    }
}
