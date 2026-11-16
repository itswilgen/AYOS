<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A request is a repeat booking when the customer already had a finished job with the same provider.
 * The server links it to that earlier request, so repeat bookings can be counted (the Phase 2 gate).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_requests', function (Blueprint $table): void {
            $table->foreignId('repeat_of_request_id')->nullable()->after('provider_profile_id')
                ->constrained('service_requests')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('service_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('repeat_of_request_id');
        });
    }
};
