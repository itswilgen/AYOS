#!/bin/sh
set -eu

cd /var/www/html

composer_lock_hash="$(sha256sum composer.lock | awk '{ print $1 }')"
installed_lock_hash=""
if [ -f vendor/.ayos-composer-lock-hash ]; then
    installed_lock_hash="$(cat vendor/.ayos-composer-lock-hash)"
fi

if [ "$composer_lock_hash" != "$installed_lock_hash" ] || [ ! -f vendor/autoload.php ]; then
    echo "Backend dependencies changed; syncing vendor from composer.lock."
    composer install --no-interaction --prefer-dist --no-progress --no-scripts
    composer dump-autoload --no-interaction --optimize
    printf '%s\n' "$composer_lock_hash" > vendor/.ayos-composer-lock-hash
fi

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
php artisan db:seed --class=PhilippineGeographySeeder --force
php artisan db:seed --class=ServiceCategorySeeder --force
if [ ! -L public/storage ]; then
    php artisan storage:link
fi

cd /var/www/html/public
exec php -S 0.0.0.0:8000 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
