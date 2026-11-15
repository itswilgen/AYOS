<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ServiceUpdate;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

/**
 * Email updates across the request and job flow: who gets which email, and what the provider may see before accepting.
 */
class ServiceEmailsTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private const ADDRESS_LINE = '26 Jesus Street';

    public function test_each_step_emails_the_right_person(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create(['name' => 'Juan Dela Cruz']);
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create(['name' => 'Ana Santos']);
        Notification::fake();

        $requestId = $this->sendRequest($customer, $providerId);
        Notification::assertSentTo($providerUser, ServiceUpdate::class, function (ServiceUpdate $mail) use ($requestId): bool {
            $text = implode(' ', $mail->lines);

            return $mail->subject === 'New request: Electrical'
                && str_contains($text, 'Barangay IX, Tanjay City')
                && ! str_contains($text, self::ADDRESS_LINE)
                && $mail->path === '/provider/requests/'.$requestId;
        });
        Notification::assertNotSentTo($customer, ServiceUpdate::class);

        $jobId = (int) $this->actingAs($providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk()->json('jobs.0.id');
        Notification::assertSentTo($customer, ServiceUpdate::class, fn (ServiceUpdate $mail): bool => $mail->subject === 'Juan Electrical Works accepted your request');

        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/schedule", ['scheduledAt' => now()->addDays(2)->toIso8601String()])->assertOk();
        Notification::assertSentTo($customer, ServiceUpdate::class, fn (ServiceUpdate $mail): bool => $mail->subject === 'Visit scheduled: Electrical'
            && str_contains(implode(' ', $mail->lines), 'When: '));

        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/start")->assertOk();
        $this->actingAs($providerUser)->postJson("/api/provider/jobs/{$jobId}/finish")->assertOk();
        Notification::assertSentTo($customer, ServiceUpdate::class, fn (ServiceUpdate $mail): bool => $mail->subject === 'Please confirm the finished work');

        // Accepted, scheduled and finished: "started" stays in-app only.
        Notification::assertSentToTimes($customer, ServiceUpdate::class, 3);
        Notification::assertSentToTimes($providerUser, ServiceUpdate::class, 1);
    }

    public function test_a_declined_request_tells_the_customer_to_try_another_provider(): void
    {
        $this->seedMarketplaceReferenceData();
        $providerUser = User::factory()->create();
        $providerId = $this->approvedProvider($providerUser);
        $customer = User::factory()->create();
        Notification::fake();

        $requestId = $this->sendRequest($customer, $providerId);
        $this->actingAs($providerUser)->postJson("/api/provider/requests/{$requestId}/decline")->assertOk();

        Notification::assertSentTo($customer, ServiceUpdate::class, fn (ServiceUpdate $mail): bool => $mail->subject === 'Your request for Electrical was declined'
            && $mail->path === '/home#services');
    }

    public function test_the_email_links_back_to_the_frontend(): void
    {
        config(['app.frontend_url' => 'https://ayos.example/']);
        $mail = new ServiceUpdate('Subject', ['A line.'], 'Open My requests', '/my-requests');
        $message = $mail->toMail(new User(['name' => 'Ana Santos']));

        $this->assertSame('Hi Ana,', $message->greeting);
        $this->assertSame('https://ayos.example/my-requests', $message->actionUrl);
    }

    private function sendRequest(User $customer, int $providerId): int
    {
        $locationId = (int) $this->actingAs($customer)->postJson('/api/me/service-locations', [
            'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009',
            'address_line' => self::ADDRESS_LINE, 'is_default' => true,
        ])->assertCreated()->json('data.id');

        return (int) $this->actingAs($customer)->postJson('/api/customer/requests', [
            'providerId' => $providerId, 'category' => 'electrical', 'serviceLocationId' => $locationId,
            'description' => 'Outlet in the kitchen sparks when used.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ])->assertCreated()->json('id');
    }
}
