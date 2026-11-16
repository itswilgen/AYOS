<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Requests to move a scheduled visit. Either side asks; only the other side accepts or declines, and the asker
 * may withdraw. Rows are kept as history (status moves off "pending"), and at most one is pending per job.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_reschedule_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('provider_job_id')->constrained('provider_jobs')->cascadeOnDelete();
            $table->string('requested_by', 12);
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('previous_at')->nullable();
            $table->timestamp('proposed_at');
            $table->string('reason', 240)->nullable();
            $table->string('status', 12)->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->index(['provider_job_id', 'status']);
        });
        // One open request per job, enforced by the database too (PostgreSQL and SQLite both support partial indexes).
        DB::statement("CREATE UNIQUE INDEX job_reschedule_one_pending ON job_reschedule_requests (provider_job_id) WHERE status = 'pending'");
    }

    public function down(): void
    {
        Schema::dropIfExists('job_reschedule_requests');
    }
};
