<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountProfileResource extends JsonResource
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
            'name' => $this->resource->name,
            'display_name' => $this->resource->profile?->display_name,
            'email' => $this->resource->email,
            'email_verified' => $this->resource->hasVerifiedEmail(),
            'mobile_number' => $this->resource->mobile_number,
        ];
    }
}
