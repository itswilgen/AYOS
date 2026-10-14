<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServiceCategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['electrical', 'Electrical', 'Wiring, fixtures and troubleshooting'],
            ['plumbing', 'Plumbing', 'Leaks, pipes and water fixtures'],
            ['carpentry', 'Carpentry', 'Woodwork and home repairs'],
            ['aircon', 'Aircon', 'Cleaning, maintenance and repair'],
            ['appliance-repair', 'Appliance repair', 'Home appliance troubleshooting'],
            ['phone-repair', 'Phone repair', 'Mobile device repairs'],
            ['computer-repair', 'Computer repair', 'Computers and laptops'],
            ['solar', 'Solar', 'Solar installation and maintenance'],
            ['cctv', 'CCTV', 'Security camera installation'],
            ['network-wifi', 'Network & Wi-Fi', 'Home and office networking'],
        ] as [$slug, $name, $description]) {
            DB::table('service_categories')->updateOrInsert(['slug' => $slug], [
                'name' => $name, 'description' => $description, 'updated_at' => now(), 'created_at' => now(),
            ]);
        }
    }
}
