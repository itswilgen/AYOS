<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A system update can be up to 1000 characters (the admin form's limit). Notifications used to cut it at
 * 240, so the open Notice card could never show the whole message. Older notices keep their cut text.
 */
return new class extends Migration
{
    private const TABLES = ['provider_notifications', 'customer_notifications'];

    public function up(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->string('detail', 1000)->change());
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $name) {
            DB::table($name)->whereRaw('char_length(detail) > 240')->update(['detail' => DB::raw("left(detail, 239) || '…'")]);
            Schema::table($name, fn (Blueprint $table) => $table->string('detail', 240)->change());
        }
    }
};
