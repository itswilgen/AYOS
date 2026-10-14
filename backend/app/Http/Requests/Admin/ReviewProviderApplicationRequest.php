<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewProviderApplicationRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['approved', 'needs_changes', 'rejected'])], 'note' => ['required_if:status,needs_changes,rejected', 'nullable', 'string', 'max:500']];
    }
}
