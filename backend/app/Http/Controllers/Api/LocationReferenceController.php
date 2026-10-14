<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LocationOptionResource;
use App\Models\Barangay;
use App\Models\CityMunicipality;
use App\Models\Province;
use App\Models\Region;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class LocationReferenceController extends Controller
{
    public function regions(): AnonymousResourceCollection
    {
        $query = Region::query()->orderBy('name');
        if ($this->coverageIsConfigured()) $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('city_municipalities')->join('supported_service_locations', 'supported_service_locations.city_municipality_code', '=', 'city_municipalities.code')->whereColumn('city_municipalities.region_code', 'regions.code')->where('supported_service_locations.is_active', true));

        return LocationOptionResource::collection($query->get(['code', 'name']));
    }

    public function provinces(string $regionCode): AnonymousResourceCollection
    {
        Region::query()->findOrFail($regionCode);

        $query = Province::query()->where('region_code', $regionCode)->orderBy('name');
        if ($this->coverageIsConfigured()) $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('city_municipalities')->join('supported_service_locations', 'supported_service_locations.city_municipality_code', '=', 'city_municipalities.code')->whereColumn('city_municipalities.province_code', 'provinces.code')->where('supported_service_locations.is_active', true));

        return LocationOptionResource::collection($query->get(['code', 'name']));
    }

    public function citiesInRegion(string $regionCode): AnonymousResourceCollection
    {
        Region::query()->findOrFail($regionCode);

        $query = CityMunicipality::query()->where('region_code', $regionCode)->orderBy('name');
        if ($this->coverageIsConfigured()) $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('supported_service_locations')->whereColumn('supported_service_locations.city_municipality_code', 'city_municipalities.code')->where('supported_service_locations.is_active', true));

        return LocationOptionResource::collection($query->get(['code', 'name', 'type']));
    }

    public function citiesInProvince(string $provinceCode): AnonymousResourceCollection
    {
        Province::query()->findOrFail($provinceCode);

        $query = CityMunicipality::query()->where('province_code', $provinceCode)->orderBy('name');
        if ($this->coverageIsConfigured()) $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('supported_service_locations')->whereColumn('supported_service_locations.city_municipality_code', 'city_municipalities.code')->where('supported_service_locations.is_active', true));

        return LocationOptionResource::collection($query->get(['code', 'name', 'type']));
    }

    public function barangays(string $cityMunicipalityCode): AnonymousResourceCollection
    {
        CityMunicipality::query()->findOrFail($cityMunicipalityCode);

        if ($this->coverageIsConfigured()) abort_unless(DB::table('supported_service_locations')->where('city_municipality_code', $cityMunicipalityCode)->where('is_active', true)->exists(), 404);
        return LocationOptionResource::collection(Barangay::query()->where('city_municipality_code', $cityMunicipalityCode)->orderBy('name')->get(['code', 'name']));
    }

    private function coverageIsConfigured(): bool { return DB::table('supported_service_locations')->exists(); }
}
