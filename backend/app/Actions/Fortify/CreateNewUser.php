<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Services\PlatformSettings;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function create(array $input): User
    {
        abort_unless(app(PlatformSettings::class)->get('registrations_enabled', true), 503, 'New account registration is temporarily unavailable.');

        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'mobile_number' => ['required', 'string', 'max:32', 'regex:/^\\+?[0-9().\\s-]{7,32}$/'],
            'terms_accepted' => ['accepted'],
            'password' => $this->passwordRules(),
        ])->validate();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'mobile_number' => preg_replace('/[().\\s-]+/', '', $input['mobile_number']),
            'password' => Hash::make($input['password']),
        ]);
        $user->forceFill(['terms_accepted_at' => now()])->save();

        return $user;
    }
}
