# AYOS MVP — Phase 1 + Phase 2

AYOS is a Philippine community service marketplace for finding trusted local help. This repository now contains the public React experience and a Laravel-backed account and security foundation.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, GSAP, Lucide
- Backend: Laravel 13, PostgreSQL, Sanctum SPA sessions, Fortify
- Session authentication uses secure cookies and CSRF protection. No access tokens or credentials are stored in browser storage.

## Run locally

### Docker (recommended)

Docker Compose starts the React/Vite frontend, Laravel API, and PostgreSQL 17 database. It keeps the database and dependency directories in named volumes, runs migrations when the API starts, and binds published ports to localhost. The database password below is for local development only.

```sh
docker compose up --build
```

Open the frontend at `http://localhost:5180`. The API is available at `http://localhost:8010`; PostgreSQL is published on `localhost:5440` if you want to connect with a local database client. Local verification and password reset emails are captured by Mailpit at `http://localhost:8025`; they are not delivered to external inboxes. To deliver mail through a real SMTP provider, set `MAIL_HOST`, `MAIL_PORT`, `MAIL_SCHEME`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM_ADDRESS` in the ignored root `.env`, then recreate the backend with `docker compose up -d --force-recreate backend`. Never commit provider credentials. Set `FRONTEND_URL` in the root `.env` if your local Vite app uses another port. Laravel creates `backend/.env` and its application key on first start when they do not exist. To stop the services, press `Ctrl+C` and run `docker compose down`. To remove the database and all persisted local data, run `docker compose down -v`.

The address setup uses manual address entry and can be updated later from the account page.

Set `AYOS_DOCKER_DB_PASSWORD` in the shell or root `.env` to override the local default. Do not use the development Compose configuration or its default password for production.

Run the backend feature suite inside the PHP container with its isolated test settings:

```sh
docker compose exec -T backend sh -c 'APP_ENV=testing DB_CONNECTION=sqlite DB_DATABASE=:memory: SESSION_DRIVER=array CACHE_STORE=array MAIL_MAILER=array QUEUE_CONNECTION=sync SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,localhost:8000,127.0.0.1:8000 php artisan test'
```

### Backend

Create a PostgreSQL database named `ayos`, then configure the backend:

```sh
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=localhost --port=8000
```

Set the PostgreSQL username/password and matching frontend origin in `backend/.env`. For local development the Vite origin is `http://localhost:5173`. Configure a real mail transport before sending verification or password reset messages outside local development; the default mail driver logs them.

### Frontend

In another terminal:

```sh
cp .env.example .env
npm install
npm run dev
```

Set `VITE_BACKEND_URL` and `VITE_API_BASE_URL` to the Laravel origin and `/api` endpoint. They default to `http://localhost:8000` and `http://localhost:8000/api`.

For production, use HTTPS, set `SESSION_SECURE_COOKIE=true`, use a shared parent `SESSION_DOMAIN` for the SPA and API hostnames, configure the exact `CORS_ALLOWED_ORIGINS`, and set `SANCTUM_STATEFUL_DOMAINS` to the frontend hostnames. Keep `APP_DEBUG=false` and use a production mail provider.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public AYOS landing page |
| `/login`, `/signup` | Login and universal account creation |
| `/forgot-password`, `/reset-password` | Password recovery |
| `/verify-email`, `/mfa/challenge` | Email confirmation and TOTP challenge |
| `/account`, `/account/security` | Protected account and security settings |
| `/account/address` | Verified-account address setup and editing |
| `/terms`, `/privacy` | Legal-document preview routes |

Signup creates one universal account; it does not ask for customer/provider role. Users must verify their email before marketplace access. Provider applications and marketplace workflows are outside this phase.

## Auth and security architecture

- `src/lib/api/client.ts` is the only frontend HTTP boundary. It obtains Laravel’s Sanctum CSRF cookie, sends `X-XSRF-TOKEN`, includes credentials, and parses Laravel validation errors.
- `src/lib/auth` owns current-user state and refresh; `RequireAuth` protects account routes. No fake auth, localStorage tokens, or password persistence are used.
- Fortify handles registration, login/logout, email verification notifications, reset links, password reset, and TOTP enrollment/challenges/recovery codes.
- The user model has no customer/provider role selector. `is_admin` is never mass assignable or exposed to the browser.
- PostgreSQL `sessions` stores revocable login sessions. The security page supports per-device sign-out and password changes revoke other sessions.
- `security_audits` records login success/failure, logout, verification, password resets/changes, MFA changes, session revocations, and blocked admin access. It excludes passwords, recovery codes, and MFA secrets.
- `php artisan ayos:admin-create email@example.ph` promotes an existing verified account after an interactive confirmation. Admin API access requires confirmed authenticator MFA.
- Login, registration, password reset, verification resend, and MFA challenge routes are rate limited. Password reset responses do not disclose whether the email is registered.
- Laravel endpoints include `POST /register`, `POST /login`, `POST /logout`, `GET /api/user`, `POST /forgot-password`, `POST /reset-password`, session endpoints under `/api/account/sessions`, and the admin access gate at `/api/admin/access-check`.

## Phase 1 design foundation

- Primary AYOS sky blue, controlled orange accent, near-black ink, and pale blue surfaces live in `src/styles/tokens.css`.
- Manrope display headings and DM Sans interface text carry through landing and auth pages.
- `src/components` contains focused landing, navigation, common, auth, and UI components. `src/layouts` shares public/auth shells.
- `src/animations` contains scoped GSAP motion with reduced-motion support and cleanup.

## Verification

```sh
cd backend && php artisan test
cd .. && npm run lint && npm run build
```

Feature tests cover universal registration and terms acceptance, safe login/current-user output, generic password reset responses, and the admin MFA gate. Responsive and keyboard checks should be repeated in the target deployment environment.

## Before launch

Replace the Terms and Privacy preview notices with reviewed policy documents, configure PostgreSQL and production mail, use HTTPS and shared-domain Sanctum cookies, and complete a production browser/accessibility review. No provider onboarding, booking, payments, reviews, or admin dashboard is part of this phase.
