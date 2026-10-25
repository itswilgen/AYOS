<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', Password::min(12), 'confirmed', 'different:current_password'],
        ];
    }

    public function messages(): array
    {
        return ['password.different' => 'Choose a new password that is different from your current one.'];
    }
}
