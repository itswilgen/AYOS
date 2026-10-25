<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A service cover is the provider's own photo or poster. It reaches the customer Home page only after review.
     */
    public function up(): void
    {
        Schema::table('provider_services', function (Blueprint $table): void {
            $table->string('cover_path')->nullable();
            $table->string('cover_status', 16)->nullable()->index();
            $table->string('cover_review_note', 300)->nullable();
            $table->string('cover_fit', 8)->default('cover');
            $table->unsignedTinyInteger('cover_focus_x')->default(50);
            $table->unsignedTinyInteger('cover_focus_y')->default(50);
            $table->timestamp('cover_submitted_at')->nullable();
            $table->timestamp('cover_reviewed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('provider_services', function (Blueprint $table): void {
            $table->dropIndex(['cover_status']);
            $table->dropColumn(['cover_path', 'cover_status', 'cover_review_note', 'cover_fit', 'cover_focus_x', 'cover_focus_y', 'cover_submitted_at', 'cover_reviewed_at']);
        });
    }
};
