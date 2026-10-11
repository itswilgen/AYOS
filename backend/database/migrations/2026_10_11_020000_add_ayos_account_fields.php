<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('mobile_number', 32)->unique()->after('email');
            $table->timestamp('terms_accepted_at')->nullable()->after('password');
            $table->boolean('is_admin')->default(false)->index()->after('terms_accepted_at');
        });

        Schema::create('security_audits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event_type', 64)->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_audits');
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique(['mobile_number']);
            $table->dropIndex(['is_admin']);
            $table->dropColumn(['mobile_number', 'terms_accepted_at', 'is_admin']);
        });
    }
};
