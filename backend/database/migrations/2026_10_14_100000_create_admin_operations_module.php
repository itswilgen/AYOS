<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 40)->unique();
            $table->string('name', 80);
            $table->timestamps();
        });
        Schema::create('permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('name', 100);
            $table->timestamps();
        });
        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });
        Schema::create('user_roles', function (Blueprint $table): void {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('role_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['user_id', 'role_id']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->string('status', 20)->default('active')->index();
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason', 500)->nullable();
        });
        Schema::table('provider_profiles', function (Blueprint $table): void {
            $table->string('review_note', 500)->nullable();
            $table->timestamp('suspended_at')->nullable();
        });
        Schema::table('provider_services', function (Blueprint $table): void {
            $table->boolean('is_visible')->default(true)->index();
        });
        Schema::table('provider_portfolio_items', function (Blueprint $table): void {
            $table->boolean('is_visible')->default(true)->index();
        });
        Schema::table('service_categories', function (Blueprint $table): void {
            $table->boolean('is_active')->default(true)->index();
        });

        Schema::create('supported_service_locations', function (Blueprint $table): void {
            $table->string('city_municipality_code', 10)->primary();
            $table->boolean('is_active')->default(true)->index();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->foreign('city_municipality_code')->references('code')->on('city_municipalities')->cascadeOnDelete();
        });
        Schema::create('system_settings', function (Blueprint $table): void {
            $table->string('key', 80)->primary();
            $table->json('value');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('provider_verification_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name', 255);
            $table->string('mime_type', 100);
            $table->timestamps();
            $table->index(['provider_profile_id', 'created_at']);
        });
        Schema::create('activation_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->string('currency', 3)->default('PHP');
            $table->string('reference', 120)->unique();
            $table->string('method', 40)->default('manual');
            $table->string('status', 20)->default('pending')->index();
            $table->string('transaction_id', 160)->nullable()->index();
            $table->text('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['provider_profile_id', 'status', 'created_at']);
        });
        Schema::create('service_disputes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_job_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('opened_by')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 50);
            $table->text('description');
            $table->string('status', 20)->default('open')->index();
            $table->text('resolution_note')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
        Schema::create('service_dispute_evidence', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('service_dispute_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name', 255);
            $table->timestamps();
        });
        Schema::create('content_reports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('target_type', 40);
            $table->unsignedBigInteger('target_id');
            $table->string('reason', 50);
            $table->text('details')->nullable();
            $table->string('status', 20)->default('open')->index();
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['target_type', 'target_id']);
            $table->index(['status', 'created_at']);
        });
        Schema::create('platform_notices', function (Blueprint $table): void {
            $table->id();
            $table->string('title', 120);
            $table->string('body', 1000);
            $table->boolean('is_active')->default(false)->index();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        $now = now();
        $roleIds = [];
        foreach ([['super_admin', 'Super admin'], ['admin', 'Administrator'], ['moderator', 'Moderator'], ['support', 'Support']] as [$slug, $name]) {
            $roleIds[$slug] = DB::table('roles')->insertGetId(['slug' => $slug, 'name' => $name, 'created_at' => $now, 'updated_at' => $now]);
        }
        $permissions = [
            'dashboard.view' => 'View dashboard', 'users.view' => 'View users', 'users.manage' => 'Manage users',
            'providers.view' => 'View providers', 'providers.review' => 'Review provider applications', 'providers.manage' => 'Manage providers',
            'listings.manage' => 'Moderate listings', 'requests.view' => 'View service requests', 'categories.manage' => 'Manage categories',
            'locations.manage' => 'Manage supported areas', 'reviews.view' => 'View reviews', 'reports.manage' => 'Manage reports',
            'disputes.manage' => 'Resolve disputes', 'settings.manage' => 'Manage platform settings', 'payments.manage' => 'Review activation payments',
            'notices.manage' => 'Manage platform notices', 'audit.view' => 'View audit logs', 'analytics.view' => 'View analytics',
            'security.view' => 'View security activity',
        ];
        $permissionIds = [];
        foreach ($permissions as $slug => $name) {
            $permissionIds[$slug] = DB::table('permissions')->insertGetId(['slug' => $slug, 'name' => $name, 'created_at' => $now, 'updated_at' => $now]);
        }
        $all = array_keys($permissions);
        $rolePermissions = [
            'super_admin' => $all,
            'admin' => $all,
            'moderator' => ['dashboard.view', 'providers.view', 'providers.review', 'providers.manage', 'listings.manage', 'requests.view', 'reviews.view', 'reports.manage', 'disputes.manage'],
            'support' => ['dashboard.view', 'users.view', 'providers.view', 'requests.view', 'disputes.manage', 'reports.manage'],
        ];
        foreach ($rolePermissions as $role => $slugs) {
            foreach ($slugs as $slug) {
                DB::table('role_permissions')->insert(['role_id' => $roleIds[$role], 'permission_id' => $permissionIds[$slug]]);
            }
        }
        $adminRoleId = $roleIds['super_admin'];
        DB::table('users')->where('is_admin', true)->get(['id'])->each(function (object $user) use ($adminRoleId, $now): void {
            DB::table('user_roles')->insertOrIgnore(['user_id' => $user->id, 'role_id' => $adminRoleId, 'assigned_by' => null, 'created_at' => $now]);
        });
        foreach ([
            'marketplace_name' => 'AYOS', 'support_email' => 'hello@ayos.ph', 'free_successful_client_quota' => 10,
            'lifetime_activation_fee' => 0, 'maintenance_mode' => false, 'registrations_enabled' => true,
            'customer_requests_enabled' => true, 'provider_applications_enabled' => true, 'activation_payments_enabled' => false,
        ] as $key => $value) {
            DB::table('system_settings')->insert(['key' => $key, 'value' => json_encode($value), 'updated_by' => null, 'created_at' => $now, 'updated_at' => $now]);
        }
    }

    public function down(): void
    {
        foreach (['platform_notices', 'content_reports', 'service_dispute_evidence', 'service_disputes', 'activation_payments', 'provider_verification_documents', 'system_settings', 'supported_service_locations'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('service_categories', fn (Blueprint $table) => $table->dropColumn('is_active'));
        Schema::table('provider_portfolio_items', fn (Blueprint $table) => $table->dropColumn('is_visible'));
        Schema::table('provider_services', fn (Blueprint $table) => $table->dropColumn('is_visible'));
        Schema::table('provider_profiles', fn (Blueprint $table) => $table->dropColumn(['review_note', 'suspended_at']));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['status', 'suspended_at', 'suspension_reason']));
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
