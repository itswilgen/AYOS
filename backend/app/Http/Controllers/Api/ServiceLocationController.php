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
        $locations = $request->user()->serviceLocations()->with(['region', 'province', 'cityMunicipality.province', 'barangay'])->orderByDesc('is_default')->orderBy('label')->get();

        return ServiceLocationResource::collection($locations);
    }

    public function store(SaveServiceLocationRequest $request): ServiceLocationResource
    {
        $user = $request->user();
        $this->authorize('create', ServiceLocation::class);
        $attributes = $request->validated();

        $location = DB::transaction(function () use ($user, $attributes): ServiceLocation {
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $locations = $user->serviceLocations();
            $hasLocations = $locations->exists();
            $hasDefault = $user->serviceLocations()->where('is_default', true)->exists();
            $makeDefault = ! $hasLocations;

            if ($hasLocations && ! $hasDefault) {
                $user->serviceLocations()->orderBy('id')->first()?->forceFill(['is_default' => true])->save();
            }

            unset($attributes['is_default']);

            return $user->serviceLocations()->create([...$attributes, 'is_default' => $makeDefault]);
        });

        return new ServiceLocationResource($location->load(['region', 'province', 'cityMunicipality.province', 'barangay']));
    }

    public function show(ServiceLocation $serviceLocation): ServiceLocationResource
    {
        $this->authorize('view', $serviceLocation);

        return new ServiceLocationResource($serviceLocation->load(['region', 'province', 'cityMunicipality.province', 'barangay']));
    }

    public function update(SaveServiceLocationRequest $request, ServiceLocation $serviceLocation): ServiceLocationResource
    {
        $this->authorize('update', $serviceLocation);
        abort_if(DB::table('service_requests')->where('service_location_id', $serviceLocation->id)->exists(), 409, 'This address is attached to a service request and cannot be edited. Add a new address instead.');
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

        return new ServiceLocationResource($location->load(['region', 'province', 'cityMunicipality.province', 'barangay']));
    }

    public function destroy(ServiceLocation $serviceLocation): Response
    {
        $this->authorize('delete', $serviceLocation);

        DB::transaction(function () use ($serviceLocation): void {
            $user = User::query()->whereKey($serviceLocation->user_id)->lockForUpdate()->firstOrFail();
            $location = $user->serviceLocations()->whereKey($serviceLocation->id)->lockForUpdate()->firstOrFail();
            abort_if(DB::table('service_requests')->where('service_location_id', $location->id)->exists(), 409, 'This address is attached to a service request and cannot be removed.');
            $wasDefault = $location->is_default;
            $location->delete();

            if ($wasDefault) {
                $nextDefault = $user->serviceLocations()->orderBy('id')->first();
                $nextDefault?->forceFill(['is_default' => true])->save();
            }
        });

        return response()->noContent();
    }

    public function makeDefault(Request $request, ServiceLocation $serviceLocation): ServiceLocationResource
    {
        $this->authorize('update', $serviceLocation);
        $user = $request->user();

        $location = DB::transaction(function () use ($user, $serviceLocation): ServiceLocation {
            $user = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            $location = $user->serviceLocations()->whereKey($serviceLocation->id)->lockForUpdate()->firstOrFail();
            $user->serviceLocations()->whereKeyNot($location->id)->update(['is_default' => false]);
            $location->forceFill(['is_default' => true])->save();

            return $location->fresh();
        });

        return new ServiceLocationResource($location->load(['region', 'province', 'cityMunicipality.province', 'barangay']));
    }
}
