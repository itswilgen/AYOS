FROM composer:2 AS composer-bin

FROM php:8.4-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        libicu-dev \
        libonig-dev \
        libpq-dev \
        libxml2-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        mbstring \
        pcntl \
        pdo_pgsql \
        zip \
    && rm -rf /var/lib/apt/lists/*

RUN printf 'upload_max_filesize=5M\npost_max_size=30M\nmax_file_uploads=10\n' > /usr/local/etc/php/conf.d/ayos-uploads.ini

COPY --from=composer-bin /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-progress --no-scripts \
    && sha256sum composer.lock | awk '{ print $1 }' > vendor/.ayos-composer-lock-hash

COPY . .
RUN composer dump-autoload --no-interaction --optimize
COPY docker/entrypoint.sh /usr/local/bin/ayos-entrypoint
RUN chmod +x /usr/local/bin/ayos-entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000

ENTRYPOINT ["ayos-entrypoint"]
