#!/bin/sh
set -eu

lock_hash="$(sha256sum package-lock.json | awk '{ print $1 }')"
installed_hash=""

if [ -f node_modules/.ayos-package-lock-hash ]; then
  installed_hash="$(cat node_modules/.ayos-package-lock-hash)"
fi

if [ "$lock_hash" != "$installed_hash" ] || [ ! -x node_modules/.bin/vite ]; then
  echo "Frontend dependencies changed; syncing node_modules from package-lock.json."
  npm ci
  printf '%s\n' "$lock_hash" > node_modules/.ayos-package-lock-hash
fi

exec "$@"
