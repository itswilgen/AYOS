<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ModerateReportRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['actioned', 'dismissed'])], 'action' => ['nullable', Rule::in(['hide'])], 'note' => ['nullable', 'string', 'max:500']];
    }
}
