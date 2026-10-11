<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['user_id', 'event_type', 'ip_address', 'user_agent', 'metadata'])]
class SecurityAudit extends Model
{
    public $timestamps = false;

    protected function casts(): array
    {
        return ['metadata' => 'array', 'created_at' => 'datetime'];
    }
}
