<?php

namespace App\Http\Requests\Admin;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

/**
 * An administrator's new password. Unlike the customer form, it doesn't ask for the current password.
 */
class ChangeOwnPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'string', Password::min(12), 'confirmed', function (string $attribute, mixed $value, Closure $fail): void {
                if (is_string($value) && Hash::check($value, $this->user()->password)) {
                    $fail('Choose a new password that is different from your current one.');
                }
            }],
        ];
    }
}
