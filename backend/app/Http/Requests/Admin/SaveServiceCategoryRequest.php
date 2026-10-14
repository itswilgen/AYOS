<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveServiceCategoryRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $categoryId = $this->route('categoryId');

        return [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'slug' => ['required', 'alpha_dash', 'max:80', Rule::unique('service_categories', 'slug')->ignore($categoryId)],
            'description' => ['nullable', 'string', 'max:240'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
