<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Region extends Model
{
    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['code', 'name'];

    /** @return HasMany<Province, $this> */
    public function provinces(): HasMany
    {
        return $this->hasMany(Province::class, 'region_code', 'code');
    }

    /** @return HasMany<CityMunicipality, $this> */
    public function citiesMunicipalities(): HasMany
    {
        return $this->hasMany(CityMunicipality::class, 'region_code', 'code');
    }
}
