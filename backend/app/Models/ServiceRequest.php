<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ServiceRequest extends Model
{
    protected $fillable = [
        'customer_id', 'provider_profile_id', 'service_category_id', 'service_location_id',
        'description', 'notes', 'preferred_at', 'status',
    ];

    protected function casts(): array
    {
        return ['preferred_at' => 'immutable_datetime'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function providerProfile(): BelongsTo
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function dispute(): HasOne
    {
        return $this->hasOne(ServiceDispute::class);
    }
}
