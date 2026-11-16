<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Providers a customer saved to book again later. One row per customer and provider. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_providers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained('provider_profiles')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'provider_profile_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_providers');
    }
};
