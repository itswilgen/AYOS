<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LocationOptionResource;
use App\Models\Barangay;
use App\Models\CityMunicipality;
use App\Models\Province;
use App\Models\Region;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LocationReferenceController extends Controller
{
    public function regions(): AnonymousResourceCollection
    {
        return LocationOptionResource::collection(Region::query()->orderBy('name')->get(['code', 'name']));
    }

    public function provinces(string $regionCode): AnonymousResourceCollection
    {
        Region::query()->findOrFail($regionCode);

        return LocationOptionResource::collection(Province::query()->where('region_code', $regionCode)->orderBy('name')->get(['code', 'name']));
    }

    public function citiesInRegion(string $regionCode): AnonymousResourceCollection
    {
        Region::query()->findOrFail($regionCode);

        return LocationOptionResource::collection(CityMunicipality::query()->where('region_code', $regionCode)->orderBy('name')->get(['code', 'name', 'type']));
    }

    public function citiesInProvince(string $provinceCode): AnonymousResourceCollection
    {
        Province::query()->findOrFail($provinceCode);

        return LocationOptionResource::collection(CityMunicipality::query()->where('province_code', $provinceCode)->orderBy('name')->get(['code', 'name', 'type']));
    }

    public function barangays(string $cityMunicipalityCode): AnonymousResourceCollection
    {
        CityMunicipality::query()->findOrFail($cityMunicipalityCode);

        return LocationOptionResource::collection(Barangay::query()->where('city_municipality_code', $cityMunicipalityCode)->orderBy('name')->get(['code', 'name']));
    }
}
