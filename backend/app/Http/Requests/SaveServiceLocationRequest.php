<?php

namespace App\Http\Requests;

use App\Models\Barangay;
use App\Models\CityMunicipality;
use App\Models\Province;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveServiceLocationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:80'],
            'region_code' => ['required', 'string', Rule::exists('regions', 'code')],
            'province_code' => ['nullable', 'string', Rule::exists('provinces', 'code')],
            'city_municipality_code' => ['required', 'string', Rule::exists('city_municipalities', 'code')],
            'barangay_code' => ['required', 'string', Rule::exists('barangays', 'code')],
            'address_line' => ['required', 'string', 'max:1000'],
            'landmark' => ['nullable', 'string', 'max:500'],
            'postal_code' => ['nullable', 'string', 'max:16'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $regionCode = (string) $this->input('region_code');
            $provinceCode = $this->input('province_code');
            $cityCode = (string) $this->input('city_municipality_code');
            $barangayCode = (string) $this->input('barangay_code');

            $province = $provinceCode ? Province::query()->find($provinceCode) : null;
            $city = CityMunicipality::query()->find($cityCode);
            $barangay = Barangay::query()->find($barangayCode);

            if ($provinceCode && (! $province || $province->region_code !== $regionCode)) {
                $validator->errors()->add('province_code', 'Choose a province within the selected region.');
            }

            if (! $city || $city->region_code !== $regionCode || $city->province_code !== $provinceCode) {
                $validator->errors()->add('city_municipality_code', 'Choose a city or municipality within the selected area.');
            }

            if (! $barangay || $barangay->city_municipality_code !== $cityCode) {
                $validator->errors()->add('barangay_code', 'Choose a barangay within the selected city or municipality.');
            }
        }];
    }
}
