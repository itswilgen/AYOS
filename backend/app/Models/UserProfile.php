<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    protected $fillable = ['display_name'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
