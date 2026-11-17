<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;

/*
 * Live chat channels. Each user hears signals about their own conversations; a conversation channel
 * (typing only) is open to its customer, and to its provider while the provider is approved.
 */
Broadcast::channel('user.{userId}', fn (User $user, int $userId): bool => $user->id === $userId);

Broadcast::channel('conversation.{conversationId}', function (User $user, int $conversationId): bool {
    $pair = DB::table('conversations as c')->join('provider_profiles as p', 'p.id', '=', 'c.provider_profile_id')
        ->where('c.id', $conversationId)->first(['c.customer_id', 'p.user_id', 'p.status']);

    return $pair !== null && ($user->id === (int) $pair->customer_id || ($user->id === (int) $pair->user_id && $pair->status === 'approved'));
});
