<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

final class JsonRegisterResponse implements RegisterResponseContract
{
    public function toResponse($request): JsonResponse
    {
        return response()->json([
            'message' => 'Account created. Please verify your email address.',
        ], JsonResponse::HTTP_CREATED);
    }
}
