# AYOS — MVP Phase 1

A responsive public marketplace landing experience and authentication UI for AYOS. The repository started empty; this app is built with React, TypeScript, Vite, Tailwind CSS, React Router, GSAP, and Lucide React.

## Run locally

```sh
npm install
cp .env.example .env
npm run dev
```

`VITE_API_BASE_URL` defaults to `/api`. No authentication request is sent in this phase. The login and signup forms validate in the browser and explain that account creation is not connected. The form data is neither stored nor transmitted.

## Routes

- `/` — AYOS landing page
- `/login` — Login UI
- `/signup` — Universal account creation UI; there is no customer/provider role choice
- `/terms` and `/privacy` — Launch preview notices; publish reviewed legal documents before enabling registration
- Unknown paths return to `/`

## Design system

Design tokens live in `src/styles/tokens.css`, with responsive styles and reusable utility behavior in `src/styles/global.css`.

- **Primary:** AYOS sky `#1682bd`; deep sky `#126c9e`; soft sky surface `#e8f3f8`
- **Accent:** Accessible orange `#c84f19` for primary action text contrast; brighter orange `#ee7a38` is available for small decorative highlights
- **Landing color composition:** Sky blue leads the full-width hero, trust band, and final CTA. Layered cyan-to-deep-sky gradients are named tokens; pale blue surfaces carry the service and location sections. Orange stays focused on actions and small highlights.
- **Neutrals:** near-black ink `#18232b`, body `#56636c`, warm white canvas `#f8f9f8`, white surfaces
- **Typography:** Manrope for display headings; DM Sans for body, forms, and navigation. Both load with system sans fallbacks.
- **Spacing:** 4px base with 8px rhythm; named tokens run from 4px through 96px
- **Surfaces:** 5px, 10px, and 16px radii; low, soft shadows only where a control needs separation
- **Controls:** 48px CTA height, clear focus ring, disabled treatment, inline field hints/errors, native checkbox, and password visibility toggle
- **Status:** red inline validation, blue informational state, green trust affordance; text accompanies color

Orange remains a controlled action accent. The hero uses authentic home-service photography with a blue tonal frame and restrained location marker. Service discovery uses nine generated, optimized WebP photos in a portrait-card carousel, with four cards visible on wide screens and chevron controls for browsing the rest. On mobile, the active card is centered while neighboring cards peek in with a subtle scale and fade. Each card has a category icon, name, and short bottom caption.

## Motion

`src/animations/usePageMotion.ts` owns the GSAP entrance and reveal choreography. The hero copy, photo crop, location marker, and image index enter in a short sequence; service, process, trust, location, provider, and final CTA groups reveal with a restrained stagger as they enter view through ScrollTrigger. The service carousel glides continuously at a restrained pace on wide screens and advances every seven seconds on smaller desktop/tablet layouts and every three seconds on mobile while visible. It pauses while hovered, focused, or in use, and has a manual pause control. Auto-advance is disabled for reduced-motion users. The blue hero ring has a slow ambient pulse, and CTA arrows shift slightly on hover. Motion uses opacity and transforms. Timelines and triggers are scoped to `gsap.context()` and reverted on unmount; CSS also disables the ambient animation, smooth scrolling, and transitions for reduced-motion users.

## Component architecture

- `src/pages` contains route-level landing, login, signup, and legal preview pages.
- `src/layouts` provides the public shell and a shared auth split layout.
- `src/components/landing` splits the marketplace story into focused hero, discovery, flow, trust, location, provider, and final CTA sections.
- `src/components/navigation` provides the desktop nav and mobile side drawer with backdrop dismissal, Escape handling, focus trapping, focus restoration, and body scroll locking.
- `src/components/auth` provides labeled fields, inline descriptions/errors, and an accessible show/hide password control.
- `src/components/ui/Button.tsx` supports link/button, variant, disabled, and loading states.
- `src/styles` centralizes the design tokens, responsive breakpoints, and global component styles.
- `src/App.tsx` lazy-loads each route; the landing page and its GSAP code are kept in a separate chunk from auth pages.

## Laravel readiness

`src/lib/api/client.ts` is the single typed request boundary. It reads the base URL from `VITE_API_BASE_URL`, sends same-origin credentials for Laravel Sanctum sessions, parses Laravel-style error messages into `ApiError`, and documents the planned `/register`, `/login`, `/logout`, and `/user` routes. Add Sanctum CSRF-cookie acquisition and typed endpoint functions in Phase 2. There are no tokens, passwords, fake JWTs, or credentials in browser storage.

## Phase 1 checks

- `npm run build` — passed (TypeScript project build and optimized Vite production build).
- Production entry bundle — 86 KB gzipped; the lazy landing/GSAP chunk is 50 KB gzipped.
- Responsive browser review — landing at 375, 390, 430, 768, 1024, 1280, 1440, and 1600 viewport settings; signup/login at phone width; hero and navigation visually reviewed on desktop and mobile. Hero decoration is clipped within its region to prevent horizontal scrolling.
- Navigation — desktop anchors and login/signup routes are present; mobile menu opens/closes, exposes its expanded state, and closes on Escape.
- Forms — blank signup produces inline errors for all required fields; controls have labels, autocomplete hints, keyboard focus styles, and password visibility controls. Submitting valid-looking data reports that auth is not connected and does not send or save it.
- Accessibility — semantic landmarks/headings, skip link on public pages, descriptive image text, labels and associated error IDs, visible focus, keyboard-operated menu, and reduced-motion support are included. The reduced-motion path is implemented in GSAP and CSS but wasn’t emulated as an OS preference during this browser pass. A formal WCAG audit and assistive-technology session remain appropriate before launch.
- Browser runtime — no obvious console errors during the route review. Authentication error/loading behavior is represented in reusable UI states; there is no backend to exercise server failures or an actual request spinner.

## Before launch

Replace the legal preview notices with reviewed Terms and Privacy documents, connect the Laravel Sanctum auth endpoints, then verify the full authentication lifecycle and production deployment configuration.
