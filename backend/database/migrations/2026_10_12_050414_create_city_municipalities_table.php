<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('city_municipalities', function (Blueprint $table): void {
            $table->string('code', 10)->primary();
            $table->string('region_code', 10);
            $table->string('province_code', 10)->nullable();
            $table->string('name', 160)->index();
            $table->string('type', 40)->default('city_municipality');
            $table->timestamps();
            $table->foreign('region_code')->references('code')->on('regions')->restrictOnDelete();
            $table->foreign('province_code')->references('code')->on('provinces')->restrictOnDelete();
            $table->index(['province_code', 'name']);
            $table->index(['region_code', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('city_municipalities');
    }
};
