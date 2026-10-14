<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('name', 80);
            $table->string('description', 240)->default('');
            $table->timestamps();
        });
        Schema::create('provider_profiles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status', 16)->default('pending')->index();
            $table->string('display_name', 80);
            $table->string('bio', 500)->default('');
            $table->unsignedTinyInteger('years_experience')->default(0);
            $table->string('photo_path')->nullable();
            $table->boolean('verified')->default(false);
            $table->boolean('accepting_requests')->default(false);
            $table->string('access_kind', 16)->default('trial');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
        Schema::create('provider_services', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_category_id')->constrained()->restrictOnDelete();
            $table->string('description', 240)->default('');
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['provider_profile_id', 'service_category_id']);
        });
        Schema::create('provider_service_areas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('region_code', 10);
            $table->string('province_code', 10)->nullable();
            $table->string('city_municipality_code', 10);
            $table->string('barangay_code', 10)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->foreign('region_code')->references('code')->on('regions')->restrictOnDelete();
            $table->foreign('province_code')->references('code')->on('provinces')->restrictOnDelete();
            $table->foreign('city_municipality_code')->references('code')->on('city_municipalities')->restrictOnDelete();
            $table->foreign('barangay_code')->references('code')->on('barangays')->restrictOnDelete();
        });
        DB::statement('CREATE UNIQUE INDEX provider_areas_city_unique ON provider_service_areas (provider_profile_id, city_municipality_code) WHERE barangay_code IS NULL');
        DB::statement('CREATE UNIQUE INDEX provider_areas_barangay_unique ON provider_service_areas (provider_profile_id, city_municipality_code, barangay_code) WHERE barangay_code IS NOT NULL');
        Schema::create('provider_portfolio_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('title', 70);
            $table->string('category', 50);
            $table->string('image_path');
            $table->timestamps();
        });
        Schema::create('service_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_category_id')->constrained()->restrictOnDelete();
            $table->foreignId('service_location_id')->constrained()->restrictOnDelete();
            $table->string('description', 1000);
            $table->string('notes', 1000)->default('');
            $table->timestamp('preferred_at');
            $table->string('status', 16)->default('new')->index();
            $table->timestamps();
            $table->index(['provider_profile_id', 'status', 'created_at']);
            $table->index(['customer_id', 'created_at']);
        });
        Schema::create('service_request_photos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('service_request_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');
            $table->timestamps();
        });
        Schema::create('provider_jobs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('service_request_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 24)->default('accepted')->index();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['provider_profile_id', 'scheduled_at']);
        });
        Schema::create('provider_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_job_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('comment', 1000)->default('');
            $table->timestamps();
        });
        Schema::create('provider_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('title', 100);
            $table->string('detail', 240);
            $table->string('href', 160);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['provider_profile_id', 'read_at', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['provider_notifications', 'provider_reviews', 'provider_jobs', 'service_request_photos', 'service_requests', 'provider_portfolio_items', 'provider_service_areas', 'provider_services', 'provider_profiles', 'service_categories'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
