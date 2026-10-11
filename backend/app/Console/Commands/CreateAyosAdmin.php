<?php

namespace App\Console\Commands;

use App\Models\SecurityAudit;
use App\Models\User;
use Illuminate\Console\Command;

class CreateAyosAdmin extends Command
{
    protected $signature = 'ayos:admin-create {email}';

    protected $description = 'Create or promote a verified AYOS administrator';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));
        $user = User::query()->where('email', $email)->first();
        if (! $user) {
            $this->components->error('Create and verify this account before granting administrator access.');

            return self::FAILURE;
        }
        if (! $user->hasVerifiedEmail()) {
            $this->components->error('Administrator accounts must have a verified email address.');

            return self::FAILURE;
        }
        if (! $this->confirm("Grant administrator access to {$user->email}?", false)) {
            return self::FAILURE;
        }
        $user->forceFill(['is_admin' => true])->save();
        SecurityAudit::create([
            'user_id' => $user->id,
            'event_type' => 'ADMIN_CREATED',
            'metadata' => ['source' => 'artisan'],
        ]);

        $this->components->info('Administrator access granted. Confirm authenticator MFA before using admin tools.');

        return self::SUCCESS;
    }
}
