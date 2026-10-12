<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('service_locations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label', 80);
            $table->string('region_code', 10);
            $table->string('province_code', 10)->nullable();
            $table->string('city_municipality_code', 10);
            $table->string('barangay_code', 10);
            $table->text('address_line');
            $table->text('landmark')->nullable();
            $table->string('postal_code', 16)->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->foreign('region_code')->references('code')->on('regions')->restrictOnDelete();
            $table->foreign('province_code')->references('code')->on('provinces')->restrictOnDelete();
            $table->foreign('city_municipality_code')->references('code')->on('city_municipalities')->restrictOnDelete();
            $table->foreign('barangay_code')->references('code')->on('barangays')->restrictOnDelete();
            $table->index(['user_id', 'is_default']);
            $table->index(['region_code', 'province_code', 'city_municipality_code', 'barangay_code'], 'service_locations_geo_index');
        });

        DB::statement('CREATE UNIQUE INDEX service_locations_one_default_per_user ON service_locations (user_id) WHERE is_default = TRUE');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS service_locations_one_default_per_user');
        Schema::dropIfExists('service_locations');
    }
};
