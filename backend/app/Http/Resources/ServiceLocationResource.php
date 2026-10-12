<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceLocationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'label' => $this->resource->label,
            'is_default' => $this->resource->is_default,
            'region' => ['code' => $this->resource->region->code, 'name' => $this->resource->region->name],
            'province' => $this->resource->province ? ['code' => $this->resource->province->code, 'name' => $this->resource->province->name] : null,
            'city_municipality' => [
                'code' => $this->resource->cityMunicipality->code,
                'name' => $this->resource->cityMunicipality->name,
                'type' => $this->resource->cityMunicipality->type,
            ],
            'barangay' => ['code' => $this->resource->barangay->code, 'name' => $this->resource->barangay->name],
            'address_line' => $this->resource->address_line,
            'landmark' => $this->resource->landmark,
            'postal_code' => $this->resource->postal_code,
        ];
    }
}
