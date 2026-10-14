<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;

class GrantAdminRole extends Command
{
    protected $signature = 'ayos:grant-admin-role {email} {role=admin}';

    protected $description = 'Assign an AYOS administrative role to an existing verified account';

    public function handle(): int
    {
        $user = User::query()->where('email', mb_strtolower(trim((string) $this->argument('email'))))->first();
        if (! $user) {
            $this->error('No AYOS account matches that email.');

            return self::FAILURE;
        }
        if (! $user->hasVerifiedEmail()) {
            $this->error('Verify the account email before granting admin access.');

            return self::FAILURE;
        }
        $role = Role::query()->where('slug', (string) $this->argument('role'))->first();
        if (! $role) {
            $this->error('Unknown role. Available roles: super_admin, admin, moderator, support.');

            return self::FAILURE;
        }
        $user->roles()->syncWithoutDetaching([$role->id => ['assigned_by' => null, 'created_at' => now()]]);
        $user->forceFill(['is_admin' => true])->save();
        $this->info("Granted {$role->slug} access to {$user->email}. Sign in at /login to open admin tools.");

        return self::SUCCESS;
    }
}
