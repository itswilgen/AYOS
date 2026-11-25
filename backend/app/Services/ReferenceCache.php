<?php

namespace App\Services;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Public reference data that is the same for everyone and rarely changes: platform settings, service
 * categories, published notices and Philippine locations. It is read from the cache (Redis) instead of
 * PostgreSQL on every request. The moment an admin or a seeder changes one of these, its whole group is
 * cleared, so nobody sees old data; the one-hour expiry is only a safety net.
 *
 * Never put anything private or per-person in here: everyone gets the same cached answer.
 */
final class ReferenceCache
{
    public const SETTINGS = 'settings';

    public const CATEGORIES = 'categories';

    public const NOTICES = 'notices';

    public const LOCATIONS = 'locations';

    private const GROUPS = [self::SETTINGS, self::CATEGORIES, self::NOTICES, self::LOCATIONS];

    private const TTL_SECONDS = 3600;

    public static function remember(string $group, string $key, Closure $load): mixed
    {
        return Cache::remember("reference:{$group}:v".self::version($group).":{$key}", self::TTL_SECONDS, $load);
    }

    /**
     * Clears whole groups at once (all of them when none are named). Each group has a version number in its
     * keys; bumping it makes every old key unreachable, and Redis drops those when they expire.
     */
    public static function clear(string ...$groups): void
    {
        foreach ($groups ?: self::GROUPS as $group) {
            $versionKey = "reference:{$group}:version";
            Cache::add($versionKey, 1, now()->addYear());
            Cache::increment($versionKey);
        }
    }

    private static function version(string $group): int
    {
        return (int) Cache::get("reference:{$group}:version", 1);
    }
}
