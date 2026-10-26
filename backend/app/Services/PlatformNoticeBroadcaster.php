<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Puts a published platform notice in every active user's notification bell, and in every approved
 * provider's workspace bell. A notice is sent once: editing or re-publishing it later doesn't notify again.
 */
class PlatformNoticeBroadcaster
{
    public function broadcastOnce(int $noticeId): void
    {
        $claimed = DB::table('platform_notices')->where('id', $noticeId)->where('is_active', true)->whereNull('notified_at')
            ->update(['notified_at' => now()]);
        if (! $claimed) {
            return;
        }

        $notice = DB::table('platform_notices')->where('id', $noticeId)->first();
        $message = [
            'title' => Str::limit($notice->title, 99, '…'),
            'detail' => Str::limit($notice->body, 239, '…'),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('users')->where('status', 'active')->select('id')->chunkById(500, function (Collection $users) use ($message): void {
            DB::table('customer_notifications')->insert($users->map(fn (object $user): array => [
                ...$message, 'customer_id' => $user->id, 'href' => '/home',
            ])->all());
        });
        DB::table('provider_profiles')->where('status', 'approved')->select('id')->chunkById(500, function (Collection $profiles) use ($message): void {
            DB::table('provider_notifications')->insert($profiles->map(fn (object $profile): array => [
                ...$message, 'provider_profile_id' => $profile->id, 'href' => '/provider/notifications',
            ])->all());
        });
    }
}
