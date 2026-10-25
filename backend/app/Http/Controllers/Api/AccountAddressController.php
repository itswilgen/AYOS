<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveAccountAddressRequest;
use App\Http\Resources\ServiceLocationResource;
use App\Models\ServiceLocation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The home address collected during account setup. It is the user's default service location, so it is ready to use
 * for service requests as soon as setup finishes.
 */
class AccountAddressController extends Controller
{
    private const RELATIONS = ['region', 'province', 'cityMunicipality.province', 'barangay'];

    public function show(Request $request): JsonResponse
    {
        $location = $request->user()->defaultServiceLocation()?->load(self::RELATIONS);

        return response()->json(['data' => $location ? new ServiceLocationResource($location) : null]);
    }

    /**
     * Updates the default location in place, unless a past request uses it; then the new address becomes the default
     * and the old one stays as a secondary location so request history keeps its address.
     */
    public function update(SaveAccountAddressRequest $request): JsonResponse
    {
        $attributes = $request->safe()->except(['label', 'terms_accepted']);
        $label = $request->validated('label') ?: 'Home';

        $location = DB::transaction(function () use ($request, $attributes, $label): ServiceLocation {
            $user = User::query()->whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $current = $user->defaultServiceLocation();

            if ($current && ! DB::table('service_requests')->where('service_location_id', $current->id)->exists()) {
                $current->fill([...$attributes, 'label' => $label])->save();
                $location = $current;
            } else {
                $user->serviceLocations()->update(['is_default' => false]);
                $location = $user->serviceLocations()->create([...$attributes, 'label' => $label, 'is_default' => true]);
            }

            if ($request->boolean('terms_accepted') && $user->terms_accepted_at === null) {
                $user->forceFill(['terms_accepted_at' => now()])->save();
            }

            return $location;
        });

        return response()->json([
            'message' => 'Your home address has been saved.',
            'data' => new ServiceLocationResource($location->load(self::RELATIONS)),
        ]);
    }
}
