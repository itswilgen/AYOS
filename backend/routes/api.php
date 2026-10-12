<?php

use App\Http\Controllers\Api\AccountAddressController;
use App\Http\Controllers\Api\AccountProfileController;
use App\Http\Controllers\Api\AccountSecurityController;
use App\Http\Controllers\Api\LocationReferenceController;
use App\Http\Controllers\Api\ServiceLocationController;
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

Route::prefix('locations')->controller(LocationReferenceController::class)->group(function (): void {
    Route::get('/regions', 'regions');
    Route::get('/regions/{regionCode}/provinces', 'provinces');
    Route::get('/regions/{regionCode}/cities-municipalities', 'citiesInRegion');
    Route::get('/provinces/{provinceCode}/cities-municipalities', 'citiesInProvince');
    Route::get('/cities-municipalities/{cityMunicipalityCode}/barangays', 'barangays');
});

Route::middleware(['auth:sanctum'])->group(function (): void {
    Route::get('/me/profile', [AccountProfileController::class, 'show']);
    Route::patch('/me/profile', [AccountProfileController::class, 'update']);
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

Route::middleware(['auth:sanctum', 'verified'])->prefix('me/service-locations')->group(function (): void {
    Route::get('/', [ServiceLocationController::class, 'index']);
    Route::post('/', [ServiceLocationController::class, 'store']);
    Route::post('/{serviceLocation}/default', [ServiceLocationController::class, 'makeDefault']);
    Route::get('/{serviceLocation}', [ServiceLocationController::class, 'show']);
    Route::put('/{serviceLocation}', [ServiceLocationController::class, 'update']);
    Route::delete('/{serviceLocation}', [ServiceLocationController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'admin', 'admin.mfa'])->prefix('admin')->group(function (): void {
    Route::get('/access-check', fn () => response()->json(['access' => 'allowed']));
});
