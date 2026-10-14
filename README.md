# AYOS MVP

AYOS is a Philippine community service marketplace for finding trusted local help. The React customer and provider experiences use a Laravel API and PostgreSQL database.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, GSAP, Lucide
- Backend: Laravel 13, PostgreSQL, Sanctum SPA sessions, Fortify
- Session authentication uses secure cookies and CSRF protection. No access tokens or credentials are stored in browser storage.

## Development setup (Docker)

Use Docker Compose as the project’s development environment. This keeps Node, PHP, PostgreSQL, and their dependencies consistent across team devices. Do not start a separate host Vite or Laravel server while using this setup.

On a new clone, create local environment files once:

```sh
cp .env.example .env
cp backend/.env.example backend/.env
```

Add development credentials to the local files when using CAPTCHA or Google sign-in. Put `VITE_RECAPTCHA_SITE_KEY` in the root `.env`; put `RECAPTCHA_SECRET_KEY`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in `backend/.env`. The backend generates an `APP_KEY` on first start. Keep both `.env` files private and preserve them between pulls.

Start or update all services with:

```sh
docker compose up --build -d
docker compose ps
```

Use `http://localhost:5180` for the frontend, `http://localhost:8010` for the API, `localhost:5440` for PostgreSQL clients, and `http://localhost:8025` for Mailpit. Mailpit captures verification and password-reset emails locally.

After pulling changes from `main`, rebuild and start the services with `docker compose up --build -d`. The backend entrypoint applies migrations, seeds the Philippine geography snapshot and ten service categories, and creates the public media symlink. The frontend and backend check their lockfiles against their persistent dependency volumes and sync dependencies when needed. To follow service logs, run `docker compose logs -f frontend backend`.

To stop containers while keeping the local database and generated app key, run `docker compose down`. `docker compose down -v` deletes the database volume and is only for intentionally resetting local data. Keep each developer’s `APP_KEY` with their own database; importing encrypted database data from another device requires the key that encrypted it.

Compose uses a local development database password by default. Do not use the development Compose configuration or its default password for production.

Run the backend feature suite inside Docker with its isolated test settings:

```sh
docker compose exec -T backend sh -c 'APP_ENV=testing DB_CONNECTION=sqlite DB_DATABASE=:memory: SESSION_DRIVER=array CACHE_STORE=array MAIL_MAILER=array QUEUE_CONNECTION=sync SANCTUM_STATEFUL_DOMAINS=localhost:5180,127.0.0.1:5180,localhost:8010,127.0.0.1:8010 php artisan test'
```

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

Signup creates one universal account; it does not ask for customer/provider role. Users must verify their email before marketplace access. A verified user can submit a provider application without creating another login.

## Provider and customer marketplace

- Provider applications start as `pending` and require review before the provider workspace becomes available.
- Approved providers manage their profile, portfolio, service categories, coverage, requests, jobs, schedule, reviews, and notifications through `/api/provider/*`. The provider workspace reads only rows belonging to the authenticated provider.
- Customers find approved providers by service and city, send a request using a saved address, and track it under **My requests**. Providers see only a broad area until they accept a request; accepted job details contain the service address.
- The job flow is `accepted → scheduled → in_progress → provider_finished → completed`. Only the customer can confirm completion and submit one review for a completed job.
- The free quota defaults to ten distinct customers with confirmed completed work. The limit is configured by `PROVIDER_FREE_CLIENT_LIMIT`. Reaching it pauses new opportunities and leaves the existing account and work available. `PROVIDER_ACTIVATION_FEE` is blank until billing is connected; there is no payment flow yet.
- Profile and portfolio images are public and limited to JPEG, PNG, or WebP. Request photos stay on the private disk and are streamed only to the assigned approved provider. Residential addresses and identity records are absent from public provider listings.

For an existing Docker checkout, run:

```sh
git pull --ff-only origin main
docker compose up --build -d
docker compose ps
```

The entrypoint runs migrations and seeds automatically. If the backend container was already running when source files were edited, run `docker compose up --build -d` to apply the current entrypoint.

## Auth and security architecture

- `src/lib/api/client.ts` is the only frontend HTTP boundary. It obtains Laravel’s Sanctum CSRF cookie, sends `X-XSRF-TOKEN`, includes credentials, and parses Laravel validation errors.
- `src/lib/auth` owns current-user state and refresh; `RequireAuth` protects account routes. No fake auth, localStorage tokens, or password persistence are used.
- Fortify handles registration, login/logout, email verification notifications, reset links, password reset, and TOTP enrollment/challenges/recovery codes.
- The user model has no customer/provider role selector. `is_admin` is never mass assignable or exposed to the browser.
- PostgreSQL `sessions` stores revocable login sessions. The security page supports per-device sign-out and password changes revoke other sessions.
- `security_audits` records login success/failure, logout, verification, password resets/changes, MFA changes, session revocations, and blocked admin access. It excludes passwords, recovery codes, and MFA secrets.
- Administrators use the same `/login` form as customers. After authentication, accounts with an admin role are routed to `/admin`; admin APIs require an active account and verified email. `/admin/login` remains an alias to the shared sign-in page. MFA remains available as an optional account security feature.
- To create the first dedicated super-admin, run `docker compose exec backend php artisan ayos:bootstrap-admin`. The command privately prompts for a new email, name, mobile number, and password (minimum 8 characters); it hashes the password, verifies the account, grants `super_admin`, and writes an audit event. It refuses to overwrite an existing account. Never commit or share the password.
- To grant admin access to an existing verified AYOS account, run `docker compose exec backend php artisan ayos:grant-admin-role email@example.ph super_admin`. The account keeps its existing password and can use `/login` to open the admin tools.
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

Feature tests cover universal registration and terms acceptance, safe login/current-user output, generic password reset responses, and the admin role and account-status gates. Responsive and keyboard checks should be repeated in the target deployment environment.

## Before launch

Replace the Terms and Privacy preview notices with reviewed policy documents, configure PostgreSQL and production mail, use HTTPS and shared-domain Sanctum cookies, and complete a production browser/accessibility review. Payment processing and the visual admin dashboard are not connected.

## Updating after a pull

```sh
git switch main
git pull --ff-only origin main
docker compose up --build -d
docker compose ps
```

## First setup on a new device

```sh
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up --build -d
docker compose ps
```

Do this once per device. Keep `.env` and `backend/.env` on that device; Git ignores them. Add that device’s CAPTCHA and Google OAuth credentials to the indicated local files if those features are needed.
