<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Online activation payments through PayMongo hosted checkout, and the pilot's pricing decision
 * (2026-11-16): ₱499 one-time lifetime access after 20 free completed clients.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activation_payments', function (Blueprint $table): void {
            $table->text('checkout_url')->nullable()->after('transaction_id');
            $table->timestamp('paid_at')->nullable()->after('reviewed_at');
        });

        // Only move settings that are still at the old defaults; a value an admin chose stays.
        $this->replaceIfStill('free_successful_client_quota', 10, 20);
        $this->replaceIfStill('lifetime_activation_fee', 0, 499);
    }

    public function down(): void
    {
        Schema::table('activation_payments', function (Blueprint $table): void {
            $table->dropColumn(['checkout_url', 'paid_at']);
        });
    }

    private function replaceIfStill(string $key, int $old, int $new): void
    {
        // `value` is a json column on PostgreSQL, which has no `=`; compare the decoded value here instead.
        $current = DB::table('system_settings')->where('key', $key)->value('value');
        if ($current !== null && json_decode((string) $current, true) === $old) {
            DB::table('system_settings')->where('key', $key)->update(['value' => json_encode($new), 'updated_at' => now()]);
        }
    }
};
