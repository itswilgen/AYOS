<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAccountProfileRequest;
use App\Http\Resources\AccountProfileResource;
use Illuminate\Http\Request;

class AccountProfileController extends Controller
{
    public function show(Request $request): AccountProfileResource
    {
        $profile = $request->user()->profile()->firstOrCreate([]);

        return new AccountProfileResource($request->user()->setRelation('profile', $profile));
    }

    public function update(UpdateAccountProfileRequest $request): AccountProfileResource
    {
        $user = $request->user();
        $validated = $request->validated();

        if (array_key_exists('name', $validated)) {
            $user->forceFill(['name' => $validated['name']])->save();
        }

        $profile = $user->profile()->firstOrCreate([]);
        if (array_key_exists('display_name', $validated)) {
            $profile->forceFill(['display_name' => $validated['display_name']])->save();
        }

        return new AccountProfileResource($user->fresh()->setRelation('profile', $profile->fresh()));
    }
}
