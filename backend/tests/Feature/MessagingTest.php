<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\ContactMasker;
use App\Services\PlatformSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class MessagingTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private User $customer;

    private User $providerUser;

    private int $providerId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedMarketplaceReferenceData();
        $this->providerUser = User::factory()->create(['name' => 'Juan Dela Cruz', 'email' => 'provider@example.test']);
        $this->providerId = $this->approvedProvider($this->providerUser);
        $this->customer = User::factory()->create(['name' => 'Maria Santos', 'email' => 'maria@example.test']);
    }

    public function test_public_profile_returns_services_and_hides_account_details(): void
    {
        $this->getJson("/api/providers/{$this->providerId}")->assertOk()
            ->assertJsonPath('data.id', (string) $this->providerId)
            ->assertJsonPath('data.displayName', 'Juan Electrical Works')
            ->assertJsonPath('data.acceptingRequests', true)
            ->assertJsonPath('data.services.0.category', 'Electrical')
            ->assertJsonPath('data.areas', ['Tanjay City'])
            ->assertJsonMissingPath('data.user_id')
            ->assertDontSee('provider@example.test');
    }

    public function test_public_profile_tells_the_owner_it_is_their_own(): void
    {
        $this->actingAs($this->customer)->getJson("/api/providers/{$this->providerId}")->assertOk()->assertJsonPath('data.isOwnProfile', false);
        $this->actingAs($this->providerUser)->getJson("/api/providers/{$this->providerId}")->assertOk()->assertJsonPath('data.isOwnProfile', true);
    }

    public function test_public_profile_returns_404_for_a_provider_who_is_not_approved(): void
    {
        DB::table('provider_profiles')->where('id', $this->providerId)->update(['status' => 'suspended']);

        $this->getJson("/api/providers/{$this->providerId}")->assertNotFound();
    }

    public function test_customer_starts_one_conversation_per_provider_and_reuses_it(): void
    {
        $first = $this->actingAs($this->customer)->postJson('/api/conversations', ['providerId' => $this->providerId])->assertCreated()->json('id');

        $this->actingAs($this->customer)->postJson('/api/conversations', ['providerId' => $this->providerId])->assertOk()->assertJsonPath('id', $first);
        $this->assertDatabaseCount('conversations', 1);
    }

    public function test_starting_a_conversation_with_your_own_provider_profile_returns_422(): void
    {
        $this->actingAs($this->providerUser)->postJson('/api/conversations', ['providerId' => $this->providerId])
            ->assertUnprocessable()->assertJsonPath('message', 'You can’t message your own provider profile.');
    }

    public function test_new_conversation_with_a_paused_provider_returns_409_but_existing_threads_stay_open(): void
    {
        $other = User::factory()->create();
        $existing = $this->startConversation($other);
        DB::table('provider_profiles')->where('id', $this->providerId)->update(['accepting_requests' => false]);

        $this->actingAs($this->customer)->postJson('/api/conversations', ['providerId' => $this->providerId])
            ->assertConflict()->assertJsonPath('message', 'This provider isn’t taking new messages right now.');
        $this->actingAs($other)->postJson("/api/conversations/{$existing}/messages", ['body' => 'Are you back next week?'])->assertCreated();
    }

    public function test_new_conversation_with_an_over_quota_trial_provider_returns_409(): void
    {
        app(PlatformSettings::class)->update(['free_successful_client_quota' => 0], null);

        $this->actingAs($this->customer)->postJson('/api/conversations', ['providerId' => $this->providerId])->assertConflict();
    }

    public function test_customer_and_provider_exchange_messages_and_track_unread(): void
    {
        $conversation = $this->startConversation($this->customer);

        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Do you fix tripping breakers?'])
            ->assertCreated()->assertJsonPath('messages.0.body', 'Do you fix tripping breakers?')->assertJsonPath('messages.0.mine', true);
        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'It happens every night.'])->assertCreated();

        $this->actingAs($this->providerUser)->getJson('/api/inbox/unread')->assertExactJson(['customer' => 0, 'provider' => 2]);
        $this->assertSame(1, DB::table('provider_notifications')->where('provider_profile_id', $this->providerId)->where('title', 'New message')->count());
        $this->actingAs($this->providerUser)->getJson('/api/provider/conversations')->assertOk()
            ->assertJsonPath('data.0.counterpart.name', 'Maria')
            ->assertJsonPath('data.0.unread', 2)
            ->assertJsonPath('data.0.lastMessage.preview', 'It happens every night.')
            ->assertDontSee('maria@example.test');

        $this->actingAs($this->providerUser)->postJson("/api/provider/conversations/{$conversation}/read")->assertOk();
        $this->actingAs($this->providerUser)->postJson("/api/provider/conversations/{$conversation}/messages", ['body' => 'Yes, I can check it tomorrow.'])->assertCreated();

        $this->actingAs($this->providerUser)->getJson('/api/inbox/unread')->assertExactJson(['customer' => 0, 'provider' => 0]);
        $this->actingAs($this->customer)->getJson('/api/inbox/unread')->assertExactJson(['customer' => 1, 'provider' => 0]);
        $this->actingAs($this->customer)->getJson('/api/customer/notifications')
            ->assertJsonPath('data.0.title', 'New message')->assertJsonPath('data.0.href', "/messages/{$conversation}");
        $this->actingAs($this->customer)->getJson("/api/conversations/{$conversation}/messages?after=0")->assertOk()
            ->assertJsonCount(3, 'messages')
            ->assertJsonPath('messages.2.role', 'provider')
            ->assertJsonPath('messages.2.mine', false)
            ->assertJsonPath('conversation.counterpart.name', 'Juan Electrical Works');
    }

    public function test_polling_after_a_message_id_returns_only_newer_messages(): void
    {
        $conversation = $this->startConversation($this->customer);
        $firstId = $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'First'])->json('id');
        $this->actingAs($this->providerUser)->postJson("/api/provider/conversations/{$conversation}/messages", ['body' => 'Second'])->assertCreated();

        $this->actingAs($this->customer)->getJson("/api/conversations/{$conversation}/messages?after={$firstId}")->assertOk()
            ->assertJsonCount(1, 'messages')->assertJsonPath('messages.0.body', 'Second');
    }

    public function test_other_users_get_404_for_a_conversation_they_are_not_part_of(): void
    {
        $conversation = $this->startConversation($this->customer);
        $this->actingAs($this->customer)->post("/api/conversations/{$conversation}/messages", ['image' => UploadedFile::fake()->image('leak.jpg')]);
        $messageId = DB::table('conversation_messages')->value('id');
        $stranger = User::factory()->create();
        $otherProvider = User::factory()->create();
        $this->approvedProvider($otherProvider, 'Other Works');

        $this->actingAs($stranger)->getJson("/api/conversations/{$conversation}/messages")->assertNotFound();
        $this->actingAs($stranger)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Hello'])->assertNotFound();
        $this->actingAs($stranger)->get("/api/conversations/{$conversation}/messages/{$messageId}/image")->assertNotFound();
        $this->actingAs($otherProvider)->getJson("/api/provider/conversations/{$conversation}/messages")->assertNotFound();
        $this->actingAs($stranger)->getJson('/api/conversations')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/conversations')->assertUnauthorized();
    }

    public function test_message_without_text_or_photo_returns_422(): void
    {
        $conversation = $this->startConversation($this->customer);

        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => ''])
            ->assertJsonValidationErrors(['body' => 'Write a message or add a photo.']);
    }

    public function test_contact_details_are_masked_until_a_job_is_accepted(): void
    {
        $conversation = $this->startConversation($this->customer);

        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Text me at 0917 123 4567 or maria@example.test'])
            ->assertCreated()
            ->assertJsonPath('messages.0.body', 'Text me at '.ContactMasker::PLACEHOLDER.' or '.ContactMasker::PLACEHOLDER)
            ->assertJsonPath('messages.0.masked', true);
        $this->assertDatabaseMissing('conversation_messages', ['body' => 'Text me at 0917 123 4567 or maria@example.test']);

        $requestId = $this->requestService();
        $this->actingAs($this->providerUser)->postJson("/api/provider/requests/{$requestId}/accept")->assertOk();

        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Call 0917 123 4567 when near.'])
            ->assertCreated()->assertJsonPath('messages.0.body', 'Call 0917 123 4567 when near.')->assertJsonPath('messages.0.masked', false);
    }

    public function test_booking_updates_appear_as_system_messages_in_an_existing_thread(): void
    {
        $conversation = $this->startConversation($this->customer);
        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Booking you now.'])->assertCreated();

        $requestId = $this->requestService();

        $this->actingAs($this->providerUser)->getJson("/api/provider/conversations/{$conversation}/messages")->assertOk()
            ->assertJsonPath('messages.1.role', 'system')
            ->assertJsonPath('messages.1.body', "Request #{$requestId} sent for Electrical.");
        $this->actingAs($this->providerUser)->getJson('/api/inbox/unread')->assertJsonPath('provider', 1);
    }

    public function test_provider_opens_a_conversation_from_a_request_they_received(): void
    {
        $requestId = $this->requestService();

        $conversation = $this->actingAs($this->providerUser)->postJson('/api/provider/conversations', ['requestId' => $requestId])->assertOk()->json('id');

        $this->assertDatabaseHas('conversations', ['id' => $conversation, 'customer_id' => $this->customer->id, 'provider_profile_id' => $this->providerId]);
        $other = User::factory()->create();
        $this->approvedProvider($other, 'Other Works');
        $this->actingAs($other)->postJson('/api/provider/conversations', ['requestId' => $requestId])->assertNotFound();
    }

    public function test_photos_are_stored_privately_and_streamed_only_to_participants(): void
    {
        Storage::fake('local');
        $conversation = $this->startConversation($this->customer);

        $response = $this->actingAs($this->customer)->post("/api/conversations/{$conversation}/messages", ['image' => UploadedFile::fake()->image('outlet.jpg', 800, 600)])
            ->assertCreated();
        $messageId = $response->json('id');
        $path = DB::table('conversation_messages')->where('id', $messageId)->value('image_path');

        Storage::disk('local')->assertExists($path);
        $this->assertStringEndsWith('.webp', $path);
        $response->assertJsonPath('messages.0.image', "/api/conversations/{$conversation}/messages/{$messageId}/image");
        $this->actingAs($this->providerUser)->get("/api/provider/conversations/{$conversation}/messages/{$messageId}/image")
            ->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    }

    public function test_reported_message_can_be_hidden_by_an_admin(): void
    {
        $conversation = $this->startConversation($this->customer);
        $messageId = $this->actingAs($this->providerUser)->postJson("/api/provider/conversations/{$conversation}/messages", ['body' => 'Rude message'])->json('id');

        $this->actingAs($this->providerUser)->postJson('/api/reports', ['target_type' => 'message', 'target_id' => $messageId, 'reason' => 'harassment'])
            ->assertNotFound();
        $reportId = $this->actingAs($this->customer)->postJson('/api/reports', ['target_type' => 'message', 'target_id' => $messageId, 'reason' => 'harassment'])
            ->assertCreated()->json('id');

        $this->actingAs($this->admin())->postJson("/api/admin/reports/{$reportId}/review", ['status' => 'actioned', 'action' => 'hide'])->assertOk();

        $this->actingAs($this->customer)->getJson("/api/conversations/{$conversation}/messages")->assertOk()
            ->assertJsonPath('messages.0.hidden', true)->assertJsonPath('messages.0.body', null)->assertDontSee('Rude message');
    }

    private function startConversation(User $customer): string
    {
        return $this->actingAs($customer)->postJson('/api/conversations', ['providerId' => $this->providerId])->assertCreated()->json('id');
    }

    private function requestService(): int
    {
        $locationId = $this->actingAs($this->customer)->postJson('/api/me/service-locations', [
            'label' => 'Home', 'region_code' => '0700000000', 'province_code' => '0704600000',
            'city_municipality_code' => '0704622000', 'barangay_code' => '0704622009',
            'address_line' => '26 Jesus Street', 'is_default' => true,
        ])->assertCreated()->json('data.id');

        return (int) $this->actingAs($this->customer)->postJson('/api/customer/requests', [
            'providerId' => $this->providerId, 'category' => 'electrical', 'serviceLocationId' => $locationId,
            'description' => 'Breaker trips every night.', 'preferredAt' => now()->addDay()->toIso8601String(),
        ])->assertCreated()->json('id');
    }
}
