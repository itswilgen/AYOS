<?php

namespace App\Http\Requests\Admin;

use App\Actions\Fortify\PasswordValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * A new administrator account, created with the password the creating admin chose for it.
 */
class CreateAdministratorRequest extends FormRequest
{
    use PasswordValidationRules;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $email = $this->input('email');
        $mobile = $this->input('mobile_number');
        $this->merge([
            'email' => is_string($email) ? Str::lower(trim($email)) : $email,
            'mobile_number' => is_string($mobile) ? preg_replace('/[().\s-]+/', '', trim($mobile)) : $mobile,
        ]);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', Rule::unique(User::class)],
            'mobile_number' => ['required', 'string', 'max:32', 'regex:/^\+?[0-9]{7,32}$/'],
            'role' => ['required', 'string', Rule::in($this->user()->assignableAdminRoles())],
            'password' => $this->passwordRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An AYOS account already uses this email.',
            'mobile_number.regex' => 'Enter a valid mobile number, like +63 917 123 4567.',
            'role.in' => 'Choose a role you’re allowed to assign. Only a super admin can add another super admin.',
        ];
    }
}
