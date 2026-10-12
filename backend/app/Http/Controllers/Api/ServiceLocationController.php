<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveServiceLocationRequest;
use App\Http\Resources\ServiceLocationResource;
use App\Models\ServiceLocation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ServiceLocationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ServiceLocation::class);
        $locations = $request->user()->serviceLocations()->with(['region', 'province', 'cityMunicipality', 'barangay'])->orderByDesc('is_default')->orderBy('label')->get();

        return ServiceLocationResource::collection($locations);
    }

    public function store(SaveServiceLocationRequest $request): ServiceLocationResource
    {
        $user = $request->user();
        $this->authorize('create', ServiceLocation::class);
        $attributes = $request->validated();

        $location = DB::transaction(function () use ($user, $attributes): ServiceLocation {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $makeDefault = (bool) ($attributes['is_default'] ?? false);
            unset($attributes['is_default']);
            if ($makeDefault) {
                $user->serviceLocations()->update(['is_default' => false]);
            }

            return $user->serviceLocations()->create([...$attributes, 'is_default' => $makeDefault]);
        });

        return new ServiceLocationResource($location->load(['region', 'province', 'cityMunicipality', 'barangay']));
    }

    public function show(ServiceLocation $serviceLocation): ServiceLocationResource
    {
        $this->authorize('view', $serviceLocation);

        return new ServiceLocationResource($serviceLocation->load(['region', 'province', 'cityMunicipality', 'barangay']));
    }

    public function update(SaveServiceLocationRequest $request, ServiceLocation $serviceLocation): ServiceLocationResource
    {
        $this->authorize('update', $serviceLocation);
        $user = $request->user();
        $attributes = $request->validated();

        $location = DB::transaction(function () use ($user, $serviceLocation, $attributes): ServiceLocation {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if (($attributes['is_default'] ?? null) === true) {
                $user->serviceLocations()->whereKeyNot($serviceLocation->id)->update(['is_default' => false]);
            }
            $serviceLocation->fill($attributes)->save();

            return $serviceLocation->fresh();
        });

        return new ServiceLocationResource($location->load(['region', 'province', 'cityMunicipality', 'barangay']));
    }

    public function destroy(ServiceLocation $serviceLocation): Response
    {
        $this->authorize('delete', $serviceLocation);
        $serviceLocation->delete();

        return response()->noContent();
    }

    public function makeDefault(Request $request, ServiceLocation $serviceLocation): ServiceLocationResource
    {
        $this->authorize('update', $serviceLocation);
        $user = $request->user();

        $location = DB::transaction(function () use ($user, $serviceLocation): ServiceLocation {
            User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $user->serviceLocations()->update(['is_default' => false]);
            $serviceLocation->forceFill(['is_default' => true])->save();

            return $serviceLocation->fresh();
        });

        return new ServiceLocationResource($location->load(['region', 'province', 'cityMunicipality', 'barangay']));
    }
}
