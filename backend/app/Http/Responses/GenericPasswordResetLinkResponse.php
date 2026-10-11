<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse;

class GenericPasswordResetLinkResponse implements FailedPasswordResetLinkRequestResponse, SuccessfulPasswordResetLinkRequestResponse
{
    public function __construct(string $status) {}

    public function toResponse($request): JsonResponse
    {
        return response()->json(['message' => 'If an AYOS account uses that email, we’ll send a password reset link shortly.']);
    }
}
