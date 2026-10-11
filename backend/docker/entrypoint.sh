#!/bin/sh
set -eu

cd /var/www/html

if [ ! -f .env ]; then
    cp .env.example .env
fi

if ! grep -Eq '^APP_KEY=base64:.+' .env; then
    php artisan key:generate --force
fi

# The bind-mounted source may carry cached settings from a host environment.
php artisan config:clear

until php artisan db:show --database=pgsql >/dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

php artisan migrate --force

cd /var/www/html/public
exec php -S 0.0.0.0:8000 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
