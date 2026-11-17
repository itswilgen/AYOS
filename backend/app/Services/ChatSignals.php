<?php

namespace App\Services;

use App\Events\ConversationUpdated;
use Illuminate\Support\Facades\DB;

/**
 * Sends live chat signals once the change is saved. If the live server is down, the message is still
 * saved and the error is only logged: pages fall back to polling, so chat keeps working.
 */
class ChatSignals
{
    /**
     * @param  'message'|'read'  $kind
     * @param  'customer'|'provider'|'system'  $side  who sent the message, or who read
     */
    public function send(int $conversationId, string $kind, string $side, int $messageId): void
    {
        DB::afterCommit(function () use ($conversationId, $kind, $side, $messageId): void {
            $pair = DB::table('conversations as c')->join('provider_profiles as p', 'p.id', '=', 'c.provider_profile_id')
                ->where('c.id', $conversationId)->first(['c.customer_id', 'p.user_id']);
            if ($pair) {
                // event(), not broadcast(): broadcast() sends only when its result is discarded, which would be
                // after rescue() returns, so a failure would escape and break the request.
                rescue(fn () => event(new ConversationUpdated([(int) $pair->customer_id, (int) $pair->user_id], $conversationId, $kind, $side, $messageId)));
            }
        });
    }
}
