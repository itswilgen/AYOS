<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records when a notice was sent to everyone's notification bell, so it is sent only once.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_notices', function (Blueprint $table): void {
            $table->timestamp('notified_at')->nullable()->after('published_at');
        });
    }

    public function down(): void
    {
        Schema::table('platform_notices', function (Blueprint $table): void {
            $table->dropColumn('notified_at');
        });
    }
};
