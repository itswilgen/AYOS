<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Notification tabs (All / Requests / Inbox / Notice): every notification gets a category.
 * Existing ones are sorted by their link, with the same rule ProviderWorkspace::category() uses for new ones.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['provider_notifications', 'customer_notifications'] as $table) {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->string('category', 16)->default('notice')->after('href');
            });
        }
        DB::table('provider_notifications')->where(fn ($q) => $q->where('href', 'like', '/provider/requests%')
            ->orWhere('href', 'like', '/provider/jobs%')->orWhere('href', 'like', '/provider/reviews%'))->update(['category' => 'request']);
        DB::table('provider_notifications')->where('href', 'like', '/provider/messages%')->update(['category' => 'inbox']);
        DB::table('customer_notifications')->where('href', 'like', '/my-requests%')->update(['category' => 'request']);
        DB::table('customer_notifications')->where('href', 'like', '/messages%')->update(['category' => 'inbox']);
    }

    public function down(): void
    {
        foreach (['provider_notifications', 'customer_notifications'] as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn('category'));
        }
    }
};
