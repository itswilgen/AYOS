<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Price guide: the lowest price a provider usually charges for a service, in whole pesos ("From ₱500").
 * Optional, because some work cannot be priced before the provider sees it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_services', function (Blueprint $table): void {
            $table->unsignedInteger('starting_price')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('provider_services', function (Blueprint $table): void {
            $table->dropColumn('starting_price');
        });
    }
};
