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
        Schema::create('barangays', function (Blueprint $table): void {
            $table->string('code', 10)->primary();
            $table->string('city_municipality_code', 10);
            $table->string('name', 160)->index();
            $table->timestamps();
            $table->foreign('city_municipality_code')->references('code')->on('city_municipalities')->restrictOnDelete();
            $table->index(['city_municipality_code', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barangays');
    }
};
