<?php

use App\Http\Controllers\Api\VerificationController;
use Illuminate\Support\Facades\Route;

Route::get('/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');
