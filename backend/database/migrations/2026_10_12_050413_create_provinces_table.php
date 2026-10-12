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
        Schema::create('provinces', function (Blueprint $table): void {
            $table->string('code', 10)->primary();
            $table->string('region_code', 10);
            $table->string('name', 160)->index();
            $table->timestamps();
            $table->foreign('region_code')->references('code')->on('regions')->restrictOnDelete();
            $table->index(['region_code', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('provinces');
    }
};
