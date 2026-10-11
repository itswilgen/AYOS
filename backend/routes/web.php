<?php

use App\Http\Controllers\Api\VerificationController;
use App\Http\Controllers\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:10,1')->prefix('auth/google')->group(function (): void {
    Route::get('/redirect', [GoogleAuthController::class, 'redirect'])->name('google.redirect');
    Route::get('/callback', [GoogleAuthController::class, 'callback'])->name('google.callback');
    Route::get('/pending', [GoogleAuthController::class, 'pendingProfile']);
    Route::post('/complete', [GoogleAuthController::class, 'complete']);
});

Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');
