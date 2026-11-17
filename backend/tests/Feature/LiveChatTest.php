<?php

namespace Tests\Feature;

use App\Events\ConversationUpdated;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastException;
use Illuminate\Broadcasting\BroadcastManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Exceptions;
use Tests\Feature\Concerns\BuildsMarketplace;
use Tests\TestCase;

class LiveChatTest extends TestCase
{
    use BuildsMarketplace, RefreshDatabase;

    private User $customer;

    private User $providerUser;

    private int $providerId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedMarketplaceReferenceData();
        $this->providerUser = User::factory()->create();
        $this->providerId = $this->approvedProvider($this->providerUser);
        $this->customer = User::factory()->create();
    }

    /**
     * Switches this test to the Reverb driver. The broadcaster is created once and kept, so the old one is
     * dropped (otherwise the new settings would be ignored) and the channel rules are registered on the new one.
     */
    private function useReverb(int $port): void
    {
        config(['broadcasting.default' => 'reverb', 'broadcasting.connections.reverb' => [
            'driver' => 'reverb', 'key' => 'test-key', 'secret' => 'test-secret', 'app_id' => 'test',
            'options' => ['host' => '127.0.0.1', 'port' => $port, 'scheme' => 'http', 'useTLS' => false],
            'client_options' => ['timeout' => 1, 'connect_timeout' => 1],
        ]]);
        app(BroadcastManager::class)->purge('reverb');
        require base_path('routes/channels.php'); // channel rules belong to the broadcaster, so register them again
    }

    public function test_a_new_message_and_a_read_signal_both_people_with_ids_only(): void
    {
        Event::fake([ConversationUpdated::class]);
        $conversation = (int) $this->actingAs($this->customer)->postJson('/api/conversations', ['providerId' => $this->providerId])->json('id');

        $messageId = (int) $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Call me at 09171234567'])
            ->assertCreated()->json('id');

        Event::assertDispatched(ConversationUpdated::class, function (ConversationUpdated $event) use ($conversation, $messageId): bool {
            $channels = array_map(fn ($channel) => $channel->name, $event->broadcastOn());

            return $event->kind === 'message' && $event->side === 'customer' && $event->conversationId === $conversation
                && $channels === ['private-user.'.$this->customer->id, 'private-user.'.$this->providerUser->id]
                // The signal never carries the message text, masked or not.
                && $event->broadcastWith() === ['conversationId' => (string) $conversation, 'kind' => 'message', 'side' => 'customer', 'messageId' => (string) $messageId];
        });

        $this->actingAs($this->providerUser)->postJson("/api/provider/conversations/{$conversation}/read")->assertOk();
        Event::assertDispatched(ConversationUpdated::class, fn (ConversationUpdated $event): bool => $event->kind === 'read' && $event->side === 'provider' && $event->messageId === $messageId);

        // Reading again with nothing new sends no second signal.
        $this->actingAs($this->providerUser)->postJson("/api/provider/conversations/{$conversation}/read")->assertOk();
        Event::assertDispatchedTimes(ConversationUpdated::class, 2);

        // Seen receipts: the customer's thread says how far the provider has read.
        $this->actingAs($this->customer)->getJson("/api/conversations/{$conversation}/messages")->assertOk()
            ->assertJsonPath('conversation.seenUpTo', (string) $messageId);
        $this->actingAs($this->providerUser)->getJson("/api/provider/conversations/{$conversation}/messages")->assertOk()
            ->assertJsonPath('conversation.seenUpTo', (string) $messageId);
    }

    public function test_a_message_is_still_saved_when_the_live_server_is_down(): void
    {
        $this->useReverb(port: 1); // nothing listens on port 1
        $conversation = (int) $this->actingAs($this->customer)->postJson('/api/conversations', ['providerId' => $this->providerId])->json('id');

        Exceptions::fake();

        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/messages", ['body' => 'Are you free on Saturday?'])->assertCreated();
        $this->actingAs($this->customer)->postJson("/api/conversations/{$conversation}/read")->assertOk();
        $this->assertDatabaseHas('conversation_messages', ['conversation_id' => $conversation, 'body' => 'Are you free on Saturday?']);
        // The live signal was tried, failed, and was only logged.
        Exceptions::assertReported(BroadcastException::class);
    }

    public function test_only_the_two_people_may_listen_to_a_conversation(): void
    {
        $this->useReverb(port: 8080);
        $conversation = (int) $this->actingAs($this->customer)->postJson('/api/conversations', ['providerId' => $this->providerId])->json('id');
        $auth = fn (User $user, string $channel) => $this->actingAs($user)->postJson('/api/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => $channel]);

        $auth($this->customer, 'private-user.'.$this->customer->id)->assertOk()->assertJsonStructure(['auth']);
        $auth($this->customer, 'private-user.'.$this->providerUser->id)->assertForbidden();
        $auth($this->customer, "private-conversation.{$conversation}")->assertOk();
        $auth($this->providerUser, "private-conversation.{$conversation}")->assertOk();
        $auth(User::factory()->create(), "private-conversation.{$conversation}")->assertForbidden();

        // A suspended provider stops hearing typing in their conversations.
        DB::table('provider_profiles')->where('id', $this->providerId)->update(['status' => 'suspended']);
        $auth($this->providerUser, "private-conversation.{$conversation}")->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->postJson('/api/broadcasting/auth', ['socket_id' => '1234.5678', 'channel_name' => 'private-user.'.$this->customer->id])->assertUnauthorized();
    }
}
