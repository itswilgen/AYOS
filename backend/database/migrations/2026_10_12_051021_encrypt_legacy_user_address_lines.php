<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('users')->whereNotNull('address_line')->orderBy('id')->chunkById(500, function ($users): void {
            foreach ($users as $user) {
                DB::table('users')->where('id', $user->id)->update(['address_line' => Crypt::encryptString($user->address_line)]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')->whereNotNull('address_line')->orderBy('id')->chunkById(500, function ($users): void {
            foreach ($users as $user) {
                try {
                    $addressLine = Crypt::decryptString($user->address_line);
                } catch (DecryptException) {
                    $addressLine = $user->address_line;
                }

                DB::table('users')->where('id', $user->id)->update(['address_line' => $addressLine]);
            }
        });
    }
};
