<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\SecurityAudit;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BootstrapAdmin extends Command
{
    protected $signature = 'ayos:bootstrap-admin';

    protected $description = 'Create the initial AYOS super administrator with privately entered credentials';

    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->ask('Admin email address')));
        $name = trim((string) $this->ask('Admin name', 'AYOS Administrator'));
        $mobile = preg_replace('/[().\s-]+/', '', trim((string) $this->ask('Admin mobile number')));

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'mobile_number' => $mobile,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'mobile_number' => ['required', 'string', 'max:32', 'regex:/^\+?[0-9]{7,32}$/', 'unique:users,mobile_number'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $password = (string) $this->secret('Admin password (minimum 8 characters)');
        $confirmation = (string) $this->secret('Confirm admin password');
        if (mb_strlen($password) < 8) {
            $this->error('Use a password with at least 8 characters.');

            return self::FAILURE;
        }
        if (! hash_equals($password, $confirmation)) {
            $this->error('The passwords do not match. No account was created.');

            return self::FAILURE;
        }

        $superAdmin = Role::query()->where('slug', 'super_admin')->first();
        if (! $superAdmin) {
            $this->error('Admin roles are missing. Run the database migrations first.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($email, $name, $mobile, $password, $superAdmin): void {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'mobile_number' => $mobile,
                'password' => $password,
            ]);
            $user->forceFill(['email_verified_at' => now(), 'is_admin' => true])->save();
            $user->roles()->attach($superAdmin->id, ['assigned_by' => null, 'created_at' => now()]);

            SecurityAudit::create([
                'user_id' => $user->id,
                'event_type' => 'ADMIN_BOOTSTRAPPED',
                'metadata' => ['source' => 'artisan'],
            ]);
        });

        $this->info("Created the AYOS super-admin account for {$email}. Sign in at /login to access admin tools. Two-factor authentication is optional.");

        return self::SUCCESS;
    }
}
