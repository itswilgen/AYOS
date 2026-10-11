<?php

use App\Http\Controllers\Api\AccountAddressController;
use App\Http\Controllers\Api\AccountSecurityController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    $user = $request->user();

    return response()->json([
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'mobile_number' => $user->mobile_number,
        'email_verified' => $user->hasVerifiedEmail(),
        'address_complete' => $user->hasCompleteAddress(),
        'customer_capability' => true,
        'mfa_enabled' => $user->hasEnabledTwoFactorAuthentication(),
    ]);
})->middleware('auth:sanctum');

Route::middleware(['auth:sanctum'])->group(function (): void {
    Route::post('/email/verification-notification', [VerificationController::class, 'resend'])->middleware('throttle:6,1');
    Route::get('/account/sessions', [AccountSecurityController::class, 'sessions']);
    Route::delete('/account/sessions/others', [AccountSecurityController::class, 'revokeOtherSessions']);
    Route::delete('/account/sessions/{id}', [AccountSecurityController::class, 'revokeSession']);
    Route::put('/account/password', [AccountSecurityController::class, 'updatePassword']);
});

Route::middleware(['auth:sanctum', 'verified'])->prefix('account')->group(function (): void {
    Route::get('/address', [AccountAddressController::class, 'show']);
    Route::put('/address', [AccountAddressController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'admin', 'admin.mfa'])->prefix('admin')->group(function (): void {
    Route::get('/access-check', fn () => response()->json(['access' => 'allowed']));
});
