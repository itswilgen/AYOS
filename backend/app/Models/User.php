<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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

    /** @return BelongsToMany<Role, $this> */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id')->withPivot('assigned_by', 'created_at');
    }

    public function hasAdminAccess(): bool
    {
        return $this->roles()->whereIn('slug', ['super_admin', 'admin', 'moderator', 'support'])->exists();
    }

    public function hasAdminPermission(string $permission): bool
    {
        return $this->roles()->whereHas('permissions', fn ($query) => $query->where('permissions.slug', $permission))->exists();
    }

    /**
     * Roles this admin may give a new administrator. Only a super admin can create another super admin.
     *
     * @return list<string>
     */
    public function assignableAdminRoles(): array
    {
        if (! $this->hasAdminPermission('admins.manage')) {
            return [];
        }
        $roles = ['admin', 'moderator', 'support'];

        return $this->roles()->where('slug', 'super_admin')->exists() ? ['super_admin', ...$roles] : $roles;
    }

    /** @return list<string> */
    public function adminPermissions(): array
    {
        return $this->roles()->with('permissions')->get()->flatMap(fn (Role $role) => $role->permissions->pluck('slug'))->unique()->values()->all();
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
