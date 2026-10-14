<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class PlatformSettings
{
    private const DEFAULTS = [
        'marketplace_name' => 'AYOS', 'support_email' => 'hello@ayos.ph',
        'free_successful_client_quota' => 10, 'lifetime_activation_fee' => 0,
        'maintenance_mode' => false, 'registrations_enabled' => true,
        'customer_requests_enabled' => true, 'provider_applications_enabled' => true,
        'activation_payments_enabled' => false, 'activation_payment_instructions' => '',
    ];

    public function all(): array
    {
        $settings = self::DEFAULTS;
        foreach (DB::table('system_settings')->get(['key', 'value']) as $row) {
            $settings[$row->key] = json_decode($row->value, true) ?? $row->value;
        }

        return $settings;
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    public function update(array $values, ?int $actorId): array
    {
        DB::transaction(function () use ($values, $actorId): void {
            foreach ($values as $key => $value) {
                $attributes = ['value' => json_encode($value, JSON_THROW_ON_ERROR), 'updated_by' => $actorId, 'updated_at' => now()];
                if (DB::table('system_settings')->where('key', $key)->exists()) {
                    DB::table('system_settings')->where('key', $key)->update($attributes);
                } else {
                    DB::table('system_settings')->insert(['key' => $key, ...$attributes, 'created_at' => now()]);
                }
            }
        });

        return $this->all();
    }
}
