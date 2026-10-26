<?php

use App\Http\Controllers\Api\AccountAddressController;
use App\Http\Controllers\Api\AccountProfileController;
use App\Http\Controllers\Api\AccountSecurityController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\CustomerServiceRequestController;
use App\Http\Controllers\Api\LocationReferenceController;
use App\Http\Controllers\Api\ProviderController;
use App\Http\Controllers\Api\ServiceDisputeController;
use App\Http\Controllers\Api\ServiceLocationController;
use App\Http\Controllers\Api\VerificationController;
use App\Services\PlatformSettings;
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
        'admin_access' => $user->hasAdminAccess(),
        'account_status' => $user->status ?? 'active',
    ]);
})->middleware('auth:sanctum');

Route::get('/platform-state', fn (PlatformSettings $settings) => response()->json(['maintenance_mode' => (bool) $settings->get('maintenance_mode', false)]));
Route::get('/platform-notices', [AdminController::class, 'publicNotices']);

Route::prefix('locations')->controller(LocationReferenceController::class)->group(function (): void {
    Route::get('/regions', 'regions');
    Route::get('/regions/{regionCode}/provinces', 'provinces');
    Route::get('/regions/{regionCode}/cities-municipalities', 'citiesInRegion');
    Route::get('/provinces/{provinceCode}/cities-municipalities', 'citiesInProvince');
    Route::get('/cities-municipalities/{cityMunicipalityCode}/barangays', 'barangays');
});

Route::middleware(['auth:sanctum', 'account.active'])->group(function (): void {
    Route::get('/me/profile', [AccountProfileController::class, 'show']);
    Route::patch('/me/profile', [AccountProfileController::class, 'update']);
    Route::post('/email/verification-notification', [VerificationController::class, 'resend'])->middleware('throttle:6,1');
    Route::get('/account/sessions', [AccountSecurityController::class, 'sessions']);
    Route::delete('/account/sessions/others', [AccountSecurityController::class, 'revokeOtherSessions']);
    Route::delete('/account/sessions/{id}', [AccountSecurityController::class, 'revokeSession']);
    Route::put('/account/password', [AccountSecurityController::class, 'updatePassword'])->middleware('throttle:6,1');
});

Route::middleware(['auth:sanctum', 'verified', 'account.active'])->prefix('account')->group(function (): void {
    Route::get('/address', [AccountAddressController::class, 'show']);
    Route::put('/address', [AccountAddressController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'verified', 'account.active'])->prefix('me/service-locations')->group(function (): void {
    Route::get('/', [ServiceLocationController::class, 'index']);
    Route::post('/', [ServiceLocationController::class, 'store']);
    Route::post('/{serviceLocation}/default', [ServiceLocationController::class, 'makeDefault']);
    Route::get('/{serviceLocation}', [ServiceLocationController::class, 'show']);
    Route::put('/{serviceLocation}', [ServiceLocationController::class, 'update']);
    Route::delete('/{serviceLocation}', [ServiceLocationController::class, 'destroy']);
});

Route::get('/service-categories', [ProviderController::class, 'categories']);
Route::get('/providers', [CustomerServiceRequestController::class, 'providers']);
Route::get('/providers/{providerId}', [CustomerServiceRequestController::class, 'profile'])->whereNumber('providerId');
Route::get('/providers/{providerId}/reviews', [CustomerServiceRequestController::class, 'reviews'])->whereNumber('providerId');
Route::get('/featured-services', [CustomerServiceRequestController::class, 'featuredServices']);

Route::middleware(['auth:sanctum', 'verified', 'account.active'])->group(function (): void {
    Route::post('/reports', [AdminController::class, 'createReport'])->middleware('throttle:6,1');
    Route::post('/customer/jobs/{jobId}/disputes', [ServiceDisputeController::class, 'store'])->middleware('throttle:5,1');
    Route::get('/customer/requests', [CustomerServiceRequestController::class, 'index']);
    Route::get('/customer/notifications', [CustomerServiceRequestController::class, 'notifications']);
    Route::post('/customer/notifications/{notificationId}/read', [CustomerServiceRequestController::class, 'readNotification']);
    Route::post('/customer/requests', [CustomerServiceRequestController::class, 'store'])->middleware(['account.active', 'throttle:12,1']);
    Route::post('/customer/jobs/{jobId}/confirm', [CustomerServiceRequestController::class, 'confirm'])->middleware('throttle:20,1');
    Route::post('/customer/jobs/{jobId}/cancel', [CustomerServiceRequestController::class, 'cancel']);
    Route::post('/customer/jobs/{jobId}/review', [CustomerServiceRequestController::class, 'review'])->middleware('throttle:10,1');

    Route::get('/inbox/unread', [ConversationController::class, 'unread']);
    Route::controller(ConversationController::class)->prefix('conversations')->name('customer.conversations.')->group(function (): void {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'start')->middleware('throttle:10,1')->name('start');
        Route::get('/{conversationId}/messages', 'messages')->whereNumber('conversationId')->name('messages');
        Route::post('/{conversationId}/messages', 'send')->whereNumber('conversationId')->middleware('throttle:30,1')->name('send');
        Route::post('/{conversationId}/read', 'read')->whereNumber('conversationId')->name('read');
        Route::get('/{conversationId}/messages/{messageId}/image', 'image')->whereNumber(['conversationId', 'messageId'])->name('image');
    });
    Route::controller(ConversationController::class)->prefix('provider/conversations')->name('provider.conversations.')->group(function (): void {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'startForRequest')->middleware('throttle:10,1')->name('start');
        Route::get('/{conversationId}/messages', 'messages')->whereNumber('conversationId')->name('messages');
        Route::post('/{conversationId}/messages', 'send')->whereNumber('conversationId')->middleware('throttle:30,1')->name('send');
        Route::post('/{conversationId}/read', 'read')->whereNumber('conversationId')->name('read');
        Route::get('/{conversationId}/messages/{messageId}/image', 'image')->whereNumber(['conversationId', 'messageId'])->name('image');
    });

    Route::get('/provider/workspace', [ProviderController::class, 'workspace'])->middleware('account.active');
    Route::post('/provider/apply', [ProviderController::class, 'apply'])->middleware(['account.active', 'throttle:3,1']);
    Route::post('/provider/activation-payments', [ProviderController::class, 'submitActivationPayment'])->middleware(['account.active', 'throttle:5,1']);
    Route::get('/provider/verification-documents/{documentId}', [ProviderController::class, 'verificationDocument'])->middleware('account.active');
    Route::get('/provider/area-options', [ProviderController::class, 'areaOptions']);
    Route::get('/provider/area-barangays', [ProviderController::class, 'areaBarangays']);
    Route::patch('/provider/accepting', [ProviderController::class, 'accepting']);
    Route::post('/provider/requests/{requestId}/accept', [ProviderController::class, 'accept']);
    Route::post('/provider/requests/{requestId}/decline', [ProviderController::class, 'decline']);
    Route::get('/provider/requests/{requestId}/photos/{photoId}', [ProviderController::class, 'requestPhoto']);
    Route::post('/provider/jobs/{jobId}/{action}', [ProviderController::class, 'jobAction']);
    Route::post('/provider/services', [ProviderController::class, 'saveService']);
    Route::put('/provider/services/{serviceId}', [ProviderController::class, 'saveService']);
    Route::post('/provider/services/{serviceId}/toggle', [ProviderController::class, 'toggleService']);
    Route::post('/provider/services/{serviceId}/cover', [ProviderController::class, 'uploadServiceCover'])->middleware('throttle:10,1');
    Route::patch('/provider/services/{serviceId}/cover', [ProviderController::class, 'updateServiceCover']);
    Route::delete('/provider/services/{serviceId}/cover', [ProviderController::class, 'removeServiceCover']);
    Route::post('/provider/areas', [ProviderController::class, 'addArea']);
    Route::delete('/provider/areas/{areaId}', [ProviderController::class, 'removeArea']);
    Route::patch('/provider/profile', [ProviderController::class, 'saveProfile']);
    Route::post('/provider/profile/photo', [ProviderController::class, 'profilePhoto'])->middleware('throttle:10,1');
    Route::post('/provider/portfolio', [ProviderController::class, 'addPortfolio'])->middleware('throttle:10,1');
    Route::delete('/provider/portfolio/{itemId}', [ProviderController::class, 'removePortfolio']);
    Route::post('/provider/notifications/{noteId}/read', [ProviderController::class, 'readNotification']);
    Route::post('/provider/notifications/read-all', [ProviderController::class, 'readAllNotifications']);
});

Route::middleware(['auth:sanctum', 'verified', 'account.active', 'admin'])->prefix('admin')->group(function (): void {
    Route::get('/access-check', fn (Request $request) => response()->json(['access' => 'allowed', 'permissions' => $request->user()->adminPermissions()]));
    Route::put('/account/password', [AccountSecurityController::class, 'updateAdminPassword'])->middleware('throttle:6,1');
    Route::get('/dashboard', [AdminController::class, 'overview'])->middleware('admin.permission:dashboard.view');
    Route::get('/users', [AdminController::class, 'users'])->middleware('admin.permission:users.view');
    Route::get('/users/{userId}', [AdminController::class, 'userDetails'])->middleware('admin.permission:users.view');
    Route::patch('/users/{userId}/status', [AdminController::class, 'setUserStatus'])->middleware('admin.permission:users.manage');
    Route::get('/provider-applications', [AdminController::class, 'providerApplications'])->middleware('admin.permission:providers.review');
    Route::get('/provider-applications/{providerId}', [AdminController::class, 'providerDetails'])->middleware('admin.permission:providers.review');
    Route::get('/provider-applications/{providerId}/documents/{documentId}', [AdminController::class, 'providerDocument'])->middleware('admin.permission:providers.review');
    Route::post('/provider-applications/{providerId}/decision', [AdminController::class, 'decideProvider'])->middleware('admin.permission:providers.review');
    Route::get('/providers', [AdminController::class, 'providers'])->middleware('admin.permission:providers.view');
    Route::get('/providers/{providerId}', [AdminController::class, 'providerDetails'])->middleware('admin.permission:providers.view');
    Route::patch('/providers/{providerId}/status', [AdminController::class, 'setProviderStatus'])->middleware('admin.permission:providers.manage');
    Route::post('/providers/{providerId}/activate', [AdminController::class, 'activateProvider'])->middleware('admin.permission:providers.manage');
    Route::post('/providers/{providerId}/verify-identity', [AdminController::class, 'verifyProvider'])->middleware('admin.permission:providers.manage');
    Route::get('/listings', [AdminController::class, 'listings'])->middleware('admin.permission:listings.manage');
    Route::patch('/listings/{type}/{listingId}/visibility', [AdminController::class, 'setListingVisibility'])->middleware('admin.permission:listings.manage');
    Route::post('/listings/service/{serviceId}/cover-review', [AdminController::class, 'reviewServiceCover'])->middleware('admin.permission:listings.manage');
    Route::get('/requests', [AdminController::class, 'requests'])->middleware('admin.permission:requests.view');
    Route::get('/categories', [AdminController::class, 'categories'])->middleware('admin.permission:categories.manage');
    Route::post('/categories', [AdminController::class, 'createCategory'])->middleware('admin.permission:categories.manage');
    Route::put('/categories/{categoryId}', [AdminController::class, 'updateCategory'])->middleware('admin.permission:categories.manage');
    Route::patch('/categories/{categoryId}/status', [AdminController::class, 'setCategoryStatus'])->middleware('admin.permission:categories.manage');
    Route::get('/locations', [AdminController::class, 'locations'])->middleware('admin.permission:locations.manage');
    Route::patch('/locations/{cityCode}/status', [AdminController::class, 'setLocationStatus'])->middleware('admin.permission:locations.manage');
    Route::get('/reviews', [AdminController::class, 'reviews'])->middleware('admin.permission:reviews.view');
    Route::get('/reports', [AdminController::class, 'reports'])->middleware('admin.permission:reports.manage');
    Route::post('/reports/{reportId}/review', [AdminController::class, 'reviewReport'])->middleware('admin.permission:reports.manage');
    Route::get('/disputes', [AdminController::class, 'disputes'])->middleware('admin.permission:disputes.manage');
    Route::get('/disputes/{disputeId}', [AdminController::class, 'disputeDetails'])->middleware('admin.permission:disputes.manage');
    Route::get('/disputes/{disputeId}/evidence/{evidenceId}', [AdminController::class, 'disputeEvidence'])->middleware('admin.permission:disputes.manage');
    Route::post('/disputes/{disputeId}/resolve', [AdminController::class, 'resolveDispute'])->middleware('admin.permission:disputes.manage');
    Route::get('/activation-payments', [AdminController::class, 'payments'])->middleware('admin.permission:payments.manage');
    Route::post('/activation-payments/{paymentId}/review', [AdminController::class, 'reviewPayment'])->middleware('admin.permission:payments.manage');
    Route::get('/settings', [AdminController::class, 'settings'])->middleware('admin.permission:settings.manage');
    Route::put('/settings', [AdminController::class, 'updateSettings'])->middleware('admin.permission:settings.manage');
    Route::get('/notices', [AdminController::class, 'notices'])->middleware('admin.permission:notices.manage');
    Route::post('/notices', [AdminController::class, 'saveNotice'])->middleware('admin.permission:notices.manage');
    Route::put('/notices/{noticeId}', [AdminController::class, 'saveNotice'])->middleware('admin.permission:notices.manage');
    Route::get('/audit-logs', [AdminController::class, 'auditLogs'])->middleware('admin.permission:audit.view');
    Route::get('/analytics', [AdminController::class, 'analytics'])->middleware('admin.permission:analytics.view');
    Route::get('/security', [AdminController::class, 'security'])->middleware('admin.permission:security.view');
    Route::post('/administrators', [AdminController::class, 'createAdministrator'])->middleware(['admin.permission:admins.manage', 'throttle:10,1']);
});
