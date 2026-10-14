<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlatformSettingsRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'marketplace_name' => ['sometimes', 'required', 'string', 'max:80'],
            'support_email' => ['sometimes', 'required', 'email', 'max:190'],
            'free_successful_client_quota' => ['sometimes', 'required', 'integer', 'between:1,10000'],
            'lifetime_activation_fee' => ['sometimes', 'required', 'integer', 'between:0,100000000'],
            'maintenance_mode' => ['sometimes', 'required', 'boolean'],
            'registrations_enabled' => ['sometimes', 'required', 'boolean'],
            'customer_requests_enabled' => ['sometimes', 'required', 'boolean'],
            'provider_applications_enabled' => ['sometimes', 'required', 'boolean'],
            'activation_payments_enabled' => ['sometimes', 'required', 'boolean'],
            'activation_payment_instructions' => ['sometimes', 'required', 'string', 'max:1000'],
        ];
    }
}
