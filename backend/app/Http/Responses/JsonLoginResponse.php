<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

final class JsonLoginResponse implements LoginResponseContract
{
    public function toResponse($request): JsonResponse
    {
        return response()->json(['two_factor' => false]);
    }
}
