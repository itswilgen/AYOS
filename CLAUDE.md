# CLAUDE.md

AYOS is a local home-services marketplace for the Philippines: React + TypeScript frontend in `src/`, Laravel API in `backend/`, PostgreSQL, Docker. Setup and commands are in `README.md`; backend-specific rules are in `backend/CLAUDE.md`.

## Start every build session with a roadmap reminder

Before touching any code in a session, the first message gives a short reminder (about five lines, simple English):

1. **Current phase**: the first roadmap phase whose gate is not met yet.
2. **Next tasks**: the next 2–3 unticked tasks in that phase, in order.
3. **Gate**: what has to be true to move to the next phase.
4. **Left open**: uncommitted work (`git status`), pages not yet checked in a browser, open questions such as the pilot date.

Sources, in this order:

- The live roadmap doc, "AYOS Project Roadmap": https://claude.ai/artifact/C3wZoLb7xonLYVtVsuqKW5. Read it with the Claude Docs connector when it is available, so ticked tasks and status changes are current.
- `git status` and the current branch in this repository.

If the requested work is outside the current phase, say so in one line and ask whether to do it now or after the phase. Then continue with the request. Don't repeat the reminder later in the same session unless a task gets finished or the phase changes.

Roadmap phases, for when the doc can't be read:

| Phase | Focus | Gate |
| --- | --- | --- |
| 0 Stabilize | Commit open work, GitHub Actions CI, pin package versions, browser-check every page, sign-up button, split `AdminPage.tsx` | CI passes on `main`; every page checked on desktop and phone |
| 1 Launch-ready | Production deploy with HTTPS and backups, lawyer review of Terms and Privacy, account deletion and data export, email notifications, activation fee, first providers | Lawyer sign-off, backups tested, 10+ approved providers live |
| 2 Engagement | "Needs you" strip, all open requests on Home, reschedule, price guide, book again, saved providers, live chat, frontend tests | Repeat bookings and provider accept times improving |
| 3 Growth | Cebuano and Filipino, SMS, seasonal reminders, urgent requests, GCash, more towns, mobile app | — |
