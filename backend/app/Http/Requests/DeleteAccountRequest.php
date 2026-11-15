<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Confirms that the signed-in person really means to delete the account.
 * Password accounts re-enter their password. Accounts made with Google got a random password they never saw,
 * so they type their email address instead.
 */
class DeleteAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        if ($this->user()->google_id !== null) {
            return ['email' => ['required', 'string', 'email', function (string $attribute, mixed $value, \Closure $fail): void {
                if (mb_strtolower(trim((string) $value)) !== mb_strtolower($this->user()->email)) {
                    $fail('Type the email address of this account to confirm.');
                }
            }]];
        }

        return ['password' => ['required', 'string', 'current_password']];
    }

    public function messages(): array
    {
        return ['password.current_password' => 'That password is not correct.'];
    }
}
