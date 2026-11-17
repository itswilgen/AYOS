#!/bin/sh
# Production start: build Laravel's caches from the server's real settings, then run the given command
# (php-fpm for the API, `php artisan reverb:start` for live chat, or a one-off such as migrations).
set -eu
cd /var/www/html

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY is missing. Set it in the server's .env (see deploy/.env.production.example)." >&2
    exit 1
fi

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# The caches above were built as root, and uploads live on a volume that starts out owned by root:
# PHP's workers run as www-data and must be able to write both.
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
