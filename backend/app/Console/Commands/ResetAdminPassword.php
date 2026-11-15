<?php

namespace App\Console\Commands;

use App\Actions\Fortify\PasswordValidationRules;
use App\Models\SecurityAudit;
use App\Models\User;
use App\Notifications\AdminPasswordChanged;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

/**
 * Recovery for an administrator who forgot their password and can't use the email reset link.
 * The new password is typed privately (never an argument, so it stays out of shell history),
 * every session is signed out, and the admin gets the usual "password changed" email.
 */
class ResetAdminPassword extends Command
{
    use PasswordValidationRules;

    protected $signature = 'ayos:reset-admin-password {email : Email of the administrator account}';

    protected $description = 'Set a new password for an AYOS administrator, entered privately';

    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->argument('email')));
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error("No AYOS account uses {$email}. Nothing was changed.");

            return self::FAILURE;
        }
        if (! $user->hasAdminAccess()) {
            $this->error("{$email} is not an administrator. Customers and providers reset their password from the Forgot password page.");

            return self::FAILURE;
        }

        $password = (string) $this->secret('New password (at least 12 characters, including a symbol)');
        $confirmation = (string) $this->secret('Confirm new password');

        $validator = Validator::make(
            ['password' => $password, 'password_confirmation' => $confirmation],
            ['password' => $this->passwordRules()],
        );
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            $this->line('Nothing was changed.');

            return self::FAILURE;
        }
        if (Hash::check($password, $user->password)) {
            $this->error('Choose a new password that is different from the current one. Nothing was changed.');

            return self::FAILURE;
        }

        if (! $this->confirm("Reset the password for {$email} and sign this account out on every device?", true)) {
            $this->line('Cancelled. Nothing was changed.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($user, $password): void {
            $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            DB::table(config('session.table'))->where('user_id', $user->id)->delete();
            SecurityAudit::create([
                'user_id' => $user->id,
                'event_type' => 'ADMIN_PASSWORD_RESET',
                'metadata' => ['source' => 'artisan'],
            ]);
        });

        // Same alert as a change from the admin console, so a reset nobody expected is noticed.
        try {
            $user->notify(new AdminPasswordChanged(now(), null, 'Server command (artisan)'));
        } catch (Throwable $exception) {
            report($exception);
            $this->warn('The password was reset, but the notification email could not be sent.');
        }

        $this->info("Password reset for {$email}. All devices were signed out. Sign in at /login with the new password.");

        return self::SUCCESS;
    }
}
