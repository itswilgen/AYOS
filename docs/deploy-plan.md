# AYOS production deploy plan

**Roadmap:** Phase 1 (Launch-ready) · **Written:** 2026-11-15 · **Branch:** `phase-1/production-deploy`

Goal: AYOS runs on the internet at its own domain with HTTPS. Data is backed up every day, emails reach real inboxes, and we find out when something breaks.

## Where AYOS stands today

The Docker setup in `compose.yaml` is **for development only**. It is not safe or fast enough for real users:

| Part | Today (development) | Production needs |
|---|---|---|
| Frontend | Vite dev server (`npm run dev`) | Built once (`npm run build`), served as static files |
| Backend | PHP's built-in test server (`php -S`), one request at a time | PHP-FPM behind a real web server, many requests at once |
| Settings | `APP_DEBUG=true`; `.env` copied from the example | `APP_DEBUG=false`; secrets set on the server only |
| Code | Mounted from your laptop folder | Baked into the Docker image |
| Email | Mailpit (catches all mail locally) | A real email provider |
| HTTPS | None | Automatic certificate |
| Backups | None | Daily database and uploads backup, copied off the server |

Good news: emails are sent right after each change is saved (`DB::afterCommit`), so **no queue worker is needed** yet. There are also no scheduled jobs, so no cron is needed.

**Live chat adds one always-on container: `reverb`** (WebSocket server). Live signals are sent right after saving too, so still no queue worker. On the VPS: proxy `wss://` through the same HTTPS domain to the `reverb` container, set a new random `REVERB_APP_KEY` and `REVERB_APP_SECRET`, set `REVERB_ALLOWED_ORIGINS` to the real domain, and build the frontend with matching `VITE_REVERB_*` values. If Reverb is down, chat falls back to polling, so it is not a launch blocker.

## The recommended setup

**One Hostinger VPS running Docker, with one domain for the app and the API.**

```
                 https://<domain>
                        │
                ┌───────▼────────┐
                │     Caddy      │  HTTPS (free, automatic), serves the built React app
                └───┬────────┬───┘
         /  (pages) │        │ /api, /sanctum, /auth, /storage
                    ▼        ▼
            React files   PHP-FPM (Laravel)
                             │
                      ┌──────▼──────┐
                      │ PostgreSQL  │  + uploads volume (photos, provider IDs)
                      └─────────────┘
```

Why this one:
- **One domain** keeps sign-in simple. Sanctum session cookies work without cross-site cookie problems. (Frontend on Vercel + backend elsewhere would break this.)
- **PostgreSQL works.** Shared hosting usually offers MySQL only.
- **Docker is already in the project**, and you know the basics.
- **It is real sysadmin practice**, which fits your goal of becoming a system admin, then a cloud or infrastructure engineer.

Other options, and why not now:

| Option | Why not now |
|---|---|
| Hostinger shared hosting | Usually no PostgreSQL and no Docker |
| Vercel (frontend) + backend elsewhere | Two domains: Sanctum cookies and CORS get harder, and you still need a PHP + PostgreSQL host |
| Managed platform (Laravel Cloud, Railway, Render) | Easier, but billed in USD, costs grow with use, and you learn less about servers |

**Server size:** at least 2 GB RAM (4 GB is comfortable), 1–2 CPU, 40 GB+ disk, in the data center nearest the Philippines. Check Hostinger's current KVM plans and prices before buying.

## Decisions needed from you

- [x] **Hosting:** Hostinger VPS (decided 2026-11-17; not bought yet)
- [x] **Domain name:** ayosofficial.com (owned)
- [x] **Email provider:** Brevo (SMTP)
- [x] **Off-server backup place:** Backblaze B2 (via rclone, encrypted)

## Steps

### Step 1: Prepare the code (I can do this now, before you buy anything)
- [x] `backend/Dockerfile.prod`: PHP-FPM image with code and `composer install --no-dev` baked in; caches config, routes and views on start
- [x] `Dockerfile.prod` (frontend): build the React app, then copy the files into the Caddy image
- [x] `deploy/Caddyfile`: HTTPS, serve the app, send `/api`, `/sanctum`, `/auth` and `/storage` to Laravel, security headers, upload size limit
- [x] `compose.prod.yaml`: Caddy, PHP-FPM, PostgreSQL; named volumes for the database and uploads; nothing exposed except ports 80 and 443
- [x] `deploy/.env.production.example`: every setting, with production values explained and no secrets
- [x] Migrations and the geography/category seeders run as a one-time **release step**, not on every container start
- [x] Test the whole production stack on this Mac with `localhost` before touching the server

Done 2026-11-17 on `phase-1/production-deploy`: tested on the Mac with the real scripts (routing, headers, cookies, live chat, uploads access, encrypted backup and restore). Server steps are in `deploy/RUNBOOK.md`.

### Step 2: Set up the server
- [ ] Buy the VPS (Ubuntu LTS) and the domain
- [ ] Point the domain's DNS (`A` record) to the server's IP
- [ ] Create a normal user with `sudo`; log in with an SSH key; turn off password and root login
- [ ] Firewall: allow only ports 22, 80 and 443
- [ ] Turn on automatic security updates
- [ ] Install Docker and the Docker Compose plugin

### Step 3: First deploy
- [ ] Clone the repo on the server; create `.env` from the example with real secrets (new `APP_KEY`, a strong database password)
- [ ] `docker compose -f compose.prod.yaml up -d --build`
- [ ] Run the release step (migrations and seeders)
- [ ] Create the first admin account
- [ ] Update outside services to the new domain:
  - [ ] Google sign-in: add `https://<domain>/auth/google/callback` as a redirect URI
  - [ ] reCAPTCHA: add the domain to the allowed list
- [ ] Smoke test on a phone: sign up, verify email, log in, send a request, provider accepts, upload a photo, download my data

### Step 4: Backups
- [ ] Daily `pg_dump` of the database + a copy of the uploads volume (provider ID documents live there)
- [ ] Keep 7 daily and 4 weekly copies; send them off the server every day
- [ ] **Test a restore once** into a fresh database. A backup you never restored is only a hope.

### Step 5: Email
- [ ] Add the provider's SPF, DKIM and DMARC records to the domain's DNS, so emails don't land in spam
- [ ] Set `MAIL_*` in `.env`; send a test email to Gmail and to Yahoo or Outlook

### Step 6: Know when something breaks
- [ ] Uptime check every 5 minutes on the home page and `/up` (Laravel's health route), with alerts to your email or phone. Free tiers: UptimeRobot or Better Stack.
- [ ] Error tracking for Laravel and React, for example Sentry's free tier. Or, at minimum, daily log files with rotation.

### Step 7: Make updates easy (after launch)
- [ ] A `deploy/deploy.sh` script: pull, build, release step, restart, with zero manual steps
- [ ] Later: GitHub Actions runs it after CI passes on `main`

## Go-live checklist
- [ ] `APP_ENV=production`, `APP_DEBUG=false`
- [ ] `SESSION_SECURE_COOKIE=true`; `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS` and `CORS_ALLOWED_ORIGINS` set to the domain
- [ ] `APP_URL` and `FRONTEND_URL` use `https://<domain>`
- [ ] No demo or seed accounts with known passwords
- [ ] Backups ran, and a restore worked
- [ ] Uptime alert tested (stop the app, get the alert, start it again)
- [ ] Lawyer-checked Terms and Privacy pages are live (separate Phase 1 task)

## What this unblocks
- The Phase 1 gate: a live pilot in Tanjay City
- The intro video's end card (`~/AYOS-marketing`, outside this repo): the web address
- Installable app (PWA, Phase 3): browsers only offer "Install" on HTTPS sites
