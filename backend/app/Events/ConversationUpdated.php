<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * A small live signal that a conversation changed: a new message, or one side read up to a message.
 * It carries ids only. Pages load the message itself through the normal API, so masking and access
 * checks stay in one place and nothing private travels over the socket.
 */
class ConversationUpdated implements ShouldBroadcastNow
{
    /**
     * @param  'message'|'read'  $kind
     * @param  list<int>  $userIds  the customer and the provider's account
     */
    public function __construct(
        public readonly array $userIds,
        public readonly int $conversationId,
        public readonly string $kind,
        public readonly string $side,
        public readonly int $messageId,
    ) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return array_map(fn (int $id): PrivateChannel => new PrivateChannel('user.'.$id), $this->userIds);
    }

    public function broadcastAs(): string
    {
        return 'conversation.updated';
    }

    /**
     * @return array{conversationId: string, kind: string, side: string, messageId: string}
     */
    public function broadcastWith(): array
    {
        return ['conversationId' => (string) $this->conversationId, 'kind' => $this->kind, 'side' => $this->side, 'messageId' => (string) $this->messageId];
    }
}
