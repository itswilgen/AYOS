<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProviderProfile extends Model
{
    protected $fillable = [
        'user_id', 'display_name', 'bio', 'years_experience', 'status', 'review_note',
        'verified', 'accepting_requests', 'access_kind', 'photo_path',
    ];

    protected function casts(): array
    {
        return ['years_experience' => 'integer', 'verified' => 'boolean', 'accepting_requests' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function activationPayments(): HasMany
    {
        return $this->hasMany(ActivationPayment::class);
    }

    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class);
    }
}
