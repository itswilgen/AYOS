<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Log;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'mobile_number', 'password'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
            'is_admin' => 'boolean',
            'password' => 'hashed',
            'latitude' => 'float',
            'longitude' => 'float',
            'address_line' => 'encrypted',
        ];
    }

    /** @return HasOne<UserProfile, $this> */
    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    /** @return HasMany<ServiceLocation, $this> */
    public function serviceLocations(): HasMany
    {
        return $this->hasMany(ServiceLocation::class);
    }

    public function defaultServiceLocation(): ?ServiceLocation
    {
        return $this->serviceLocations()->where('is_default', true)->first();
    }

    public function legacyAddressLine(): ?string
    {
        try {
            return $this->address_line;
        } catch (DecryptException) {
            Log::warning('Unable to decrypt a legacy user address; the user must re-enter it.', [
                'user_id' => $this->getKey(),
            ]);

            return null;
        }
    }

    public function hasCompleteAddress(): bool
    {
        if ($this->serviceLocations()->exists()) {
            return true;
        }

        return filled($this->legacyAddressLine())
            && filled($this->barangay)
            && filled($this->city)
            && filled($this->province);
    }
}
