<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Lets super admins and administrators create administrator accounts from the admin console.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $permissionId = DB::table('permissions')->insertGetId(['slug' => 'admins.manage', 'name' => 'Manage administrators', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('roles')->whereIn('slug', ['super_admin', 'admin'])->pluck('id')
            ->each(fn (int $roleId) => DB::table('role_permissions')->insert(['role_id' => $roleId, 'permission_id' => $permissionId]));
    }

    public function down(): void
    {
        DB::table('permissions')->where('slug', 'admins.manage')->delete();
    }
};
