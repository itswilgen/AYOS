<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LocationOptionResource;
use App\Models\Barangay;
use App\Models\CityMunicipality;
use App\Models\Province;
use App\Models\Region;
use App\Services\ReferenceCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Philippine locations for address and coverage pickers. The answers are cached (ReferenceCache::LOCATIONS):
 * the geography seeder and the admin's supported-locations switch clear them.
 */
class LocationReferenceController extends Controller
{
    public function regions(): JsonResponse
    {
        return response()->json(['data' => ReferenceCache::remember(ReferenceCache::LOCATIONS, 'regions', function (): array {
            $query = Region::query()->orderBy('name');
            if ($this->coverageIsConfigured()) {
                $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('city_municipalities')->join('supported_service_locations', 'supported_service_locations.city_municipality_code', '=', 'city_municipalities.code')->whereColumn('city_municipalities.region_code', 'regions.code')->where('supported_service_locations.is_active', true));
            }

            return LocationOptionResource::collection($query->get(['code', 'name']))->resolve();
        })]);
    }

    public function provinces(string $regionCode): JsonResponse
    {
        return response()->json(['data' => ReferenceCache::remember(ReferenceCache::LOCATIONS, 'provinces:'.$regionCode, function () use ($regionCode): array {
            Region::query()->findOrFail($regionCode);

            $query = Province::query()->where('region_code', $regionCode)->orderBy('name');
            if ($this->coverageIsConfigured()) {
                $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('city_municipalities')->join('supported_service_locations', 'supported_service_locations.city_municipality_code', '=', 'city_municipalities.code')->whereColumn('city_municipalities.province_code', 'provinces.code')->where('supported_service_locations.is_active', true));
            }

            return LocationOptionResource::collection($query->get(['code', 'name']))->resolve();
        })]);
    }

    public function citiesInRegion(string $regionCode): JsonResponse
    {
        return response()->json(['data' => ReferenceCache::remember(ReferenceCache::LOCATIONS, 'cities-in-region:'.$regionCode, function () use ($regionCode): array {
            Region::query()->findOrFail($regionCode);

            $query = CityMunicipality::query()->where('region_code', $regionCode)->orderBy('name');
            if ($this->coverageIsConfigured()) {
                $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('supported_service_locations')->whereColumn('supported_service_locations.city_municipality_code', 'city_municipalities.code')->where('supported_service_locations.is_active', true));
            }

            return LocationOptionResource::collection($query->get(['code', 'name', 'type']))->resolve();
        })]);
    }

    public function citiesInProvince(string $provinceCode): JsonResponse
    {
        return response()->json(['data' => ReferenceCache::remember(ReferenceCache::LOCATIONS, 'cities-in-province:'.$provinceCode, function () use ($provinceCode): array {
            Province::query()->findOrFail($provinceCode);

            $query = CityMunicipality::query()->where('province_code', $provinceCode)->orderBy('name');
            if ($this->coverageIsConfigured()) {
                $query->whereExists(fn ($cities) => $cities->selectRaw('1')->from('supported_service_locations')->whereColumn('supported_service_locations.city_municipality_code', 'city_municipalities.code')->where('supported_service_locations.is_active', true));
            }

            return LocationOptionResource::collection($query->get(['code', 'name', 'type']))->resolve();
        })]);
    }

    public function barangays(string $cityMunicipalityCode): JsonResponse
    {
        return response()->json(['data' => ReferenceCache::remember(ReferenceCache::LOCATIONS, 'barangays:'.$cityMunicipalityCode, function () use ($cityMunicipalityCode): array {
            CityMunicipality::query()->findOrFail($cityMunicipalityCode);

            if ($this->coverageIsConfigured()) {
                abort_unless(DB::table('supported_service_locations')->where('city_municipality_code', $cityMunicipalityCode)->where('is_active', true)->exists(), 404);
            }

            return LocationOptionResource::collection(Barangay::query()->where('city_municipality_code', $cityMunicipalityCode)->orderBy('name')->get(['code', 'name']))->resolve();
        })]);
    }

    private function coverageIsConfigured(): bool
    {
        return DB::table('supported_service_locations')->exists();
    }
}
