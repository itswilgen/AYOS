<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained('provider_profiles')->cascadeOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->unsignedBigInteger('customer_last_read_id')->default(0);
            $table->unsignedBigInteger('provider_last_read_id')->default(0);
            $table->timestamps();
            $table->unique(['customer_id', 'provider_profile_id']);
            $table->index(['customer_id', 'last_message_at']);
            $table->index(['provider_profile_id', 'last_message_at']);
        });

        Schema::create('conversation_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->string('sender_role', 12);
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body')->nullable();
            $table->string('image_path')->nullable();
            $table->boolean('masked')->default(false);
            $table->timestamp('hidden_at')->nullable();
            $table->timestamps();
            $table->index(['conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_messages');
        Schema::dropIfExists('conversations');
    }
};
