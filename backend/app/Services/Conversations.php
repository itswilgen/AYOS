<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Customer ↔ provider conversations. One thread per customer and provider pair, shared by both sides.
 * Each side reads only threads it belongs to; anything else is a 404 so thread ids reveal nothing.
 * Contact details stay masked until the pair has a booked job.
 */
class Conversations
{
    private const PAGE = 100;

    public function __construct(private ProviderWorkspace $workspace, private ContactMasker $masker, private PublicImageStore $images) {}

    /**
     * @return object the conversation row, when the user takes part in it as the given side
     */
    public function forParticipant(int $conversationId, int $userId, string $side): object
    {
        $query = DB::table('conversations')->where('id', $conversationId);
        $side === 'provider'
            ? $query->where('provider_profile_id', $this->workspace->approved($userId)->id)
            : $query->where('customer_id', $userId);
        $conversation = $query->first();
        abort_unless($conversation, 404);

        return $conversation;
    }

    public function open(int $customerId, int $profileId): object
    {
        DB::table('conversations')->insertOrIgnore([
            'customer_id' => $customerId, 'provider_profile_id' => $profileId, 'created_at' => now(), 'updated_at' => now(),
        ]);

        return DB::table('conversations')->where('customer_id', $customerId)->where('provider_profile_id', $profileId)->first();
    }

    public function contactShared(object $conversation): bool
    {
        return DB::table('provider_jobs')->where('customer_id', $conversation->customer_id)
            ->where('provider_profile_id', $conversation->provider_profile_id)->where('status', '!=', 'cancelled')->exists();
    }

    public function send(object $conversation, string $side, int $senderId, ?string $body, ?UploadedFile $image): int
    {
        $text = filled($body) ? trim($body) : null;
        $masked = false;
        if ($text !== null && ! $this->contactShared($conversation)) {
            [$text, $masked] = $this->masker->mask($text);
        }
        $imagePath = $image ? $this->images->store($image, 'conversations/'.$conversation->id, 'image', 1600, 1600, 'local') : null;

        return DB::transaction(function () use ($conversation, $side, $senderId, $text, $masked, $imagePath): int {
            $recipient = $side === 'customer' ? 'provider' : 'customer';
            $alreadyWaiting = $this->unreadIn($conversation->id, $recipient, (int) $conversation->{$recipient.'_last_read_id'}) > 0;
            $id = DB::table('conversation_messages')->insertGetId([
                'conversation_id' => $conversation->id, 'sender_role' => $side, 'sender_id' => $senderId,
                'body' => $text, 'image_path' => $imagePath, 'masked' => $masked, 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('conversations')->where('id', $conversation->id)
                ->update(['last_message_at' => now(), $side.'_last_read_id' => $id, 'updated_at' => now()]);
            if (! $alreadyWaiting) {
                $this->notifyRecipient($conversation, $side);
            }

            return $id;
        });
    }

    /**
     * Adds a booking update to the thread, if the pair already talks. Never creates a thread on its own.
     */
    public function note(int $customerId, int $profileId, string $text): void
    {
        $conversationId = DB::table('conversations')->where('customer_id', $customerId)->where('provider_profile_id', $profileId)->value('id');
        if (! $conversationId) {
            return;
        }
        DB::table('conversation_messages')->insert([
            'conversation_id' => $conversationId, 'sender_role' => 'system', 'body' => Str::limit($text, 240),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('conversations')->where('id', $conversationId)->update(['last_message_at' => now(), 'updated_at' => now()]);
    }

    public function markRead(object $conversation, string $side): void
    {
        $latest = (int) DB::table('conversation_messages')->where('conversation_id', $conversation->id)->max('id');
        DB::table('conversations')->where('id', $conversation->id)->where($side.'_last_read_id', '<', $latest)
            ->update([$side.'_last_read_id' => $latest]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(int $userId, string $side): array
    {
        $query = DB::table('conversations as c')->join('provider_profiles as p', 'p.id', '=', 'c.provider_profile_id')
            ->join('users as u', 'u.id', '=', 'c.customer_id')->whereNotNull('c.last_message_at')
            ->select('c.*', 'p.display_name', 'p.photo_path', 'p.status as provider_status', 'u.name as customer_name');
        $side === 'provider'
            ? $query->where('c.provider_profile_id', $this->workspace->approved($userId)->id)
            : $query->where('c.customer_id', $userId);
        $conversations = $query->orderByDesc('c.last_message_at')->limit(self::PAGE)->get();
        $latest = DB::table('conversation_messages')->whereIn('id', DB::table('conversation_messages')
            ->whereIn('conversation_id', $conversations->pluck('id'))->selectRaw('MAX(id)')->groupBy('conversation_id'))
            ->get()->keyBy('conversation_id');
        $unread = $this->unreadByConversation($conversations, $side);

        return $conversations->map(fn (object $c): array => [
            ...$this->summary($c, $side),
            'lastMessage' => ($message = $latest->get($c->id)) ? [
                'preview' => $this->preview($message), 'mine' => $message->sender_role === $side, 'createdAt' => $this->iso($message->created_at),
            ] : null,
            'unread' => (int) ($unread[$c->id] ?? 0),
        ])->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function thread(object $conversation, string $side, int $afterId = 0): array
    {
        $row = DB::table('conversations as c')->join('provider_profiles as p', 'p.id', '=', 'c.provider_profile_id')
            ->join('users as u', 'u.id', '=', 'c.customer_id')->where('c.id', $conversation->id)
            ->select('c.*', 'p.display_name', 'p.photo_path', 'p.status as provider_status', 'u.name as customer_name')->first();
        $messages = DB::table('conversation_messages')->where('conversation_id', $conversation->id)
            ->when($afterId > 0, fn ($query) => $query->where('id', '>', $afterId)->orderBy('id')->limit(self::PAGE),
                fn ($query) => $query->orderByDesc('id')->limit(self::PAGE))
            ->get()->sortBy('id')->values();
        $base = $side === 'provider' ? '/api/provider/conversations/' : '/api/conversations/';

        return [
            'conversation' => [...$this->summary($row, $side), 'contactShared' => $this->contactShared($conversation)],
            'messages' => $messages->map(fn (object $m): array => [
                'id' => (string) $m->id, 'role' => $m->sender_role, 'mine' => $m->sender_role === $side,
                'body' => $m->hidden_at ? null : $m->body,
                'image' => $m->hidden_at || ! $m->image_path ? null : $base.$conversation->id.'/messages/'.$m->id.'/image',
                'masked' => (bool) $m->masked, 'hidden' => $m->hidden_at !== null, 'createdAt' => $this->iso($m->created_at),
            ])->all(),
        ];
    }

    public function image(object $conversation, int $messageId): ?string
    {
        $path = DB::table('conversation_messages')->where('id', $messageId)->where('conversation_id', $conversation->id)
            ->whereNull('hidden_at')->value('image_path');

        return $path && Storage::disk('local')->exists($path) ? $path : null;
    }

    /**
     * @return array{customer: int, provider: int}
     */
    public function unreadCounts(int $userId): array
    {
        $customer = DB::table('conversations')->where('customer_id', $userId)->get();
        $profile = $this->workspace->profile($userId);
        $provider = $profile?->status === 'approved' ? DB::table('conversations')->where('provider_profile_id', $profile->id)->get() : collect();

        return [
            'customer' => array_sum($this->unreadByConversation($customer, 'customer')),
            'provider' => array_sum($this->unreadByConversation($provider, 'provider')),
        ];
    }

    /**
     * @param  Collection<int, object>  $conversations
     * @return array<int, int> unread messages per conversation id, written by the other side
     */
    private function unreadByConversation(Collection $conversations, string $side): array
    {
        if ($conversations->isEmpty()) {
            return [];
        }
        $other = $side === 'customer' ? 'provider' : 'customer';
        $readUpTo = $conversations->pluck($side.'_last_read_id', 'id');

        return DB::table('conversation_messages')->whereIn('conversation_id', $readUpTo->keys())
            ->where('sender_role', $other)->whereNull('hidden_at')->get(['id', 'conversation_id'])
            ->filter(fn (object $m): bool => $m->id > (int) $readUpTo[$m->conversation_id])
            ->countBy('conversation_id')->all();
    }

    private function unreadIn(int $conversationId, string $side, int $readUpTo): int
    {
        return DB::table('conversation_messages')->where('conversation_id', $conversationId)->where('id', '>', $readUpTo)
            ->where('sender_role', $side === 'customer' ? 'provider' : 'customer')->whereNull('hidden_at')->count();
    }

    private function notifyRecipient(object $conversation, string $senderSide): void
    {
        if ($senderSide === 'customer') {
            $name = $this->firstName(DB::table('users')->where('id', $conversation->customer_id)->value('name'));
            $this->workspace->notify($conversation->provider_profile_id, 'New message', $name.' sent you a message.', '/provider/messages/'.$conversation->id);

            return;
        }
        $name = DB::table('provider_profiles')->where('id', $conversation->provider_profile_id)->value('display_name');
        $this->workspace->notifyCustomer($conversation->customer_id, 'New message', Str::limit($name, 120).' replied to your message.', '/messages/'.$conversation->id);
    }

    /**
     * Customers see the provider's public name and photo; providers see only the customer's first name.
     *
     * @return array<string, mixed>
     */
    private function summary(object $row, string $side): array
    {
        return [
            'id' => (string) $row->id,
            'counterpart' => $side === 'provider'
                ? ['name' => $this->firstName($row->customer_name), 'photo' => null, 'providerId' => null]
                : ['name' => $row->display_name, 'photo' => $row->photo_path ? Storage::disk('public')->url($row->photo_path) : null, 'providerId' => (string) $row->provider_profile_id],
            'canSend' => $row->provider_status === 'approved',
            'lastMessageAt' => $this->iso($row->last_message_at),
        ];
    }

    private function preview(object $message): string
    {
        return match (true) {
            $message->hidden_at !== null => 'Message removed by AYOS',
            filled($message->body) => Str::limit($message->body, 80),
            default => 'Photo',
        };
    }

    /**
     * Stored times are UTC without an offset; the browser needs the offset to show local time.
     */
    private function iso(?string $value): ?string
    {
        return $value ? Carbon::parse($value, 'UTC')->toIso8601ZuluString() : null;
    }

    private function firstName(?string $name): string
    {
        return explode(' ', trim($name ?: 'Customer'))[0];
    }
}
