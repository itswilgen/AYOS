<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;
use SplFileObject;

class PhilippineGeographySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $path = database_path('data/psgc-2026-q2.csv');
        if (! File::exists($path)) {
            throw new RuntimeException('PSGC snapshot is missing. Restore backend/database/data/psgc-2026-q2.csv.');
        }

        $records = ['region' => [], 'province' => [], 'city_municipality' => [], 'barangay' => []];
        $file = new SplFileObject($path, 'r');
        $file->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::DROP_NEW_LINE);
        $headers = $file->fgetcsv();

        if ($headers !== ['level', 'code', 'name', 'region_code', 'province_code', 'city_municipality_code', 'type']) {
            throw new RuntimeException('The PSGC CSV header does not match the expected import format.');
        }

        foreach ($file as $row) {
            if (! is_array($row) || count($row) < 7 || ! isset($records[$row[0]])) {
                continue;
            }

            [$level, $code, $name, $regionCode, $provinceCode, $cityCode, $type] = $row;
            if (! is_string($code) || ! preg_match('/^\d{10}$/', $code) || ! is_string($name) || $name === '') {
                throw new RuntimeException('A PSGC record has an invalid code or name.');
            }

            $records[$level][] = match ($level) {
                'region' => ['code' => $code, 'name' => $name],
                'province' => ['code' => $code, 'name' => $name, 'region_code' => $regionCode],
                'city_municipality' => [
                    'code' => $code,
                    'name' => $name,
                    'region_code' => $regionCode,
                    'province_code' => $provinceCode !== '' ? $provinceCode : null,
                    'type' => $type,
                ],
                'barangay' => ['code' => $code, 'name' => $name, 'city_municipality_code' => $cityCode],
            };
        }

        if (count($records['region']) !== 18 || count($records['province']) !== 82 || count($records['city_municipality']) !== 1656 || count($records['barangay']) !== 42010) {
            throw new RuntimeException('The PSGC snapshot is incomplete or contains unexpected record counts.');
        }

        DB::transaction(function () use ($records): void {
            foreach (['regions' => 'region', 'provinces' => 'province', 'city_municipalities' => 'city_municipality', 'barangays' => 'barangay'] as $table => $level) {
                foreach (array_chunk($records[$level], 1000) as $chunk) {
                    $now = now();
                    $chunk = array_map(static fn (array $record): array => [...$record, 'created_at' => $now, 'updated_at' => $now], $chunk);
                    DB::table($table)->upsert($chunk, ['code'], ['name', 'updated_at', ...array_values(array_diff(array_keys($chunk[0]), ['code', 'name', 'created_at', 'updated_at']))]);
                }
            }
        });
    }
}
