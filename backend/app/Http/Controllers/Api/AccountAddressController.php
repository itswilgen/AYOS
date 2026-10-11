<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveAccountAddressRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountAddressController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->addressPayload($request));
    }

    public function update(SaveAccountAddressRequest $request): JsonResponse
    {
        $request->user()->forceFill($request->validated())->save();

        return response()->json([
            'message' => 'Your address has been saved.',
            ...$this->addressPayload($request),
        ]);
    }

    /** @return array<string, string|float|null> */
    private function addressPayload(Request $request): array
    {
        $user = $request->user();

        return [
            'address_line' => $user->address_line,
            'barangay' => $user->barangay,
            'city' => $user->city,
            'province' => $user->province,
            'postal_code' => $user->postal_code,
            'latitude' => $user->latitude === null ? null : (float) $user->latitude,
            'longitude' => $user->longitude === null ? null : (float) $user->longitude,
        ];
    }
}
