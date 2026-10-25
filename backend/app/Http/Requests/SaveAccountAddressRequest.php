<?php

namespace App\Http\Requests;

/**
 * The home address from account setup. It is saved as the user's default service location, so it uses the same
 * region → province → city → barangay checks as any saved location.
 */
class SaveAccountAddressRequest extends SaveServiceLocationRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $rules = parent::rules();
        unset($rules['is_default']);

        return [
            ...$rules,
            'label' => ['nullable', 'string', 'max:80'],
            'terms_accepted' => ['sometimes', 'accepted'],
        ];
    }
}
