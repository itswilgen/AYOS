<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SetUserStatusRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['active', 'suspended'])], 'reason' => ['required_if:status,suspended', 'nullable', 'string', 'max:500']];
    }
}
