# AYOS Phase 3 backend integration guide

This guide connects the authenticated customer home UI to Laravel. The current React pages and DTOs already exist; profile and saved-location requests already call Laravel. Categories, provider discovery, active requests, and notifications are still sample adapters. This is an implementation plan, not a claim that those marketplace APIs already exist.

## Current API status

| Feature | Current state | Frontend entry point |
|---|---|---|
| Customer profile | Laravel API exists | `src/services/profile.service.ts` |
| Saved locations and Philippine geography | Laravel API exists; location loading currently fails in the running browser and needs the configuration check below | `src/services/locations.service.ts` |
| Categories | Local sample data | `src/services/home.service.ts` |
| Featured providers and search | Local sample data; current examples are explicitly marked | `src/services/home.service.ts` |
| Active requests | Empty sample adapter | `src/services/home.service.ts` |
| Notifications | Empty sample adapter | `src/services/home.service.ts` |

The current frontend DTOs are in `src/types/marketplace.ts`; endpoint response expectations are also recorded in `docs/marketplace-api-contract.md`.

## First: restore the existing saved-location API

The signed-in browser is open at `http://localhost:5218`, while `compose.yaml` supplies Sanctum stateful domains for port `5180` (lines 49–50). `backend/config/cors.php` accepts local origins by pattern, but the Compose value for `SANCTUM_STATEFUL_DOMAINS` does not include `5218`. This mismatch can make browser requests lose Sanctum session authentication even when the page itself shows the signed-in user.

Choose one consistent local frontend origin:

1. Recommended: open the Docker frontend at `http://localhost:5180` and use its matching CORS/Sanctum settings.
2. If intentionally using Vite on port `5218`, add both `localhost:5218` and `127.0.0.1:5218` to `SANCTUM_STATEFUL_DOMAINS` in `compose.yaml` line 49. Also add `http://localhost:5218` to `CORS_ALLOWED_ORIGINS` in line 50 if the CORS pattern is ever removed or restricted.

After changing Compose environment values, recreate the backend container so Laravel receives them, then clear Laravel's cached configuration:

```sh
docker compose up -d --force-recreate backend
docker compose exec backend php artisan optimize:clear
docker compose exec backend php artisan route:list --path=api/me/service-locations
```

In Chrome Network, check `GET http://localhost:8010/api/me/service-locations`. Expected: `200` with `{ "data": [] }` for an account without saved locations, or `{ "data": [...] }` otherwise. A `401` points to session/Sanctum cookies; a CORS error points to origin configuration; a `404` means the running backend does not have the route; a `500` requires checking Laravel logs. The route is declared in `backend/routes/api.php` lines 50–56 and handled by `backend/app/Http/Controllers/Api/ServiceLocationController.php`.

## Backend work, in order

### 1. Keep the existing account APIs stable

No new account endpoint is required for this UI. The existing profile and location services expect Laravel resource envelopes (`{ data: ... }`):

- `GET/PATCH /api/me/profile` — `backend/routes/api.php` lines 35–37; frontend adapter: `src/services/profile.service.ts`.
- `GET/POST/PUT/DELETE /api/me/service-locations` and `POST /api/me/service-locations/{id}/default` — `backend/routes/api.php` lines 50–56; frontend adapter: `src/services/locations.service.ts`.
- Geography lookup endpoints are public and declared in `backend/routes/api.php` lines 27–33.

Before extending them, verify all requests use the same host family (`localhost` consistently, or `127.0.0.1` consistently), the browser sends credentials, and the logged-in user's session cookie is included. `src/lib/api/client.ts` already sets `credentials: 'include'` at lines 73–77 and uses the configured API base at lines 109–117.

### 2. Add service categories

Create the backend files:

- `backend/database/migrations/<timestamp>_create_service_categories_table.php`
- `backend/app/Models/ServiceCategory.php`
- `backend/app/Http/Resources/ServiceCategoryResource.php`
- `backend/app/Http/Controllers/Api/ServiceCategoryController.php`
- `backend/database/seeders/ServiceCategorySeeder.php`

Suggested columns: `id`, unique `slug`, `name`, `short_description`, `icon_key`, `is_active`, `sort_order`, timestamps. Seed the ten category slugs represented by `ServiceIconKey` in `src/types/marketplace.ts` lines 1–19. The API should return active categories ordered by `sort_order` then name:

```json
{
  "data": [
    { "id": 1, "slug": "electrical", "name": "Electrical", "shortDescription": "Wiring, lighting, outlets and troubleshooting.", "icon": "electrical" }
  ]
}
```

Use one wire naming convention. The sample above matches the current TypeScript DTO; if Laravel emits snake_case, map it to the frontend DTO inside `src/services/home.service.ts` rather than mixing casing in components.

### 3. Add provider profiles and service search

Create the backend files:

- `backend/database/migrations/<timestamp>_create_provider_profiles_table.php`
- `backend/database/migrations/<timestamp>_create_provider_services_table.php` (or an equivalent pivot table)
- `backend/app/Models/ProviderProfile.php`
- `backend/app/Http/Resources/ProviderSummaryResource.php`
- `backend/app/Http/Controllers/Api/ProviderSearchController.php`
- A query/service class such as `backend/app/Services/ProviderSearchService.php`

Keep the user account separate from the provider's public profile. The search response should include only public provider fields and a broad service-area label. Never return `address_line`, landmark, email, mobile number, exact coordinates, or session/account data. The existing `ServiceLocation` model hides encrypted address fields (`backend/app/Models/ServiceLocation.php` lines 9–23); preserve that privacy boundary for provider search too.

Proposed endpoints:

- `GET /api/providers/featured?location_id={saved_location_id}`
- `GET /api/providers/search?service={query}&location_id={saved_location_id}`

Authenticate and verify the customer. Resolve `location_id` through the signed-in user's saved locations; reject IDs owned by another user. Validate query length and pagination. Include only providers who explicitly published a profile and whose service area/category matches. Ratings, completed-service counts, availability, and verification status must come from real stored facts; do not carry the demo values into production responses.

The frontend DTO is `ProviderSummary` in `src/types/marketplace.ts` lines 21–33. On successful API rollout, replace `providersService.getFeaturedProviders` and `providersService.searchProviders` in `src/services/home.service.ts` lines 40–61 with `apiRequest` calls. Keep or remove the sample adapter only after product confirms the transition; do not silently label live results as sample data.

### 4. Add the customer's request list

Create `service_requests` storage and model/resource/controller files, for example:

- `backend/database/migrations/<timestamp>_create_service_requests_table.php`
- `backend/app/Models/ServiceRequest.php`
- `backend/app/Http/Resources/ServiceRequestSummaryResource.php`
- `backend/app/Http/Controllers/Api/CustomerRequestController.php`

Expose `GET /api/me/requests?status=active` inside the existing `auth:sanctum` and `verified` group in `backend/routes/api.php` after line 57. Always scope records with `$request->user()->...`; never trust a customer ID from the query string. Return `{ data: [...] }` with `id`, service name, status, broad location label, and ISO `updated_at`. The React adapter can format the timestamp as `updatedAtLabel`.

The current UI reads `ServiceRequestSummary` from `src/types/marketplace.ts` lines 81–87 and calls `requestsService.getActiveRequests()` in `src/services/home.service.ts` lines 63–68. Replace the sample call only after this endpoint exists. Empty results must return `200` and `data: []`.

### 5. Add notifications

Use Laravel's database notification mechanism (add its migration if the project does not already have it), then create a small `NotificationSummaryResource` and `CustomerNotificationController`. Expose `GET /api/me/notifications` within authenticated routes. Return only the current user's notifications, with title, description, creation timestamp, and unread state. Do not add mark-as-read mutations until the UI provides that action.

The UI adapter is `notificationsService.getNotifications()` in `src/services/home.service.ts` lines 70–75; the header consumes its unread state in `src/components/navigation/AuthenticatedHeader.tsx` lines 20–22 and 79–85. Return `{ data: [] }` when there are no notifications.

## Route registration and policy placement

Add `use` imports near the top of `backend/routes/api.php` lines 3–10. Keep public geography lookups public. Add customer marketplace routes inside the verified authenticated group, after the current service-location group (currently line 57), for example:

```php
Route::middleware(['auth:sanctum', 'verified'])->group(function (): void {
    Route::get('/services', [ServiceCategoryController::class, 'index']);
    Route::get('/providers/featured', [ProviderSearchController::class, 'featured']);
    Route::get('/providers/search', [ProviderSearchController::class, 'search']);
    Route::get('/me/requests', [CustomerRequestController::class, 'index']);
    Route::get('/me/notifications', [CustomerNotificationController::class, 'index']);
});
```

Use Laravel policies for provider profile visibility, saved-location ownership, and request ownership. Do not accept arbitrary `user_id`/`customer_id` filters for `/me` routes. Validate all incoming filters with Form Requests or validated query rules and return consistent `401`, `403`, `404`, and `422` JSON responses without SQL traces or secrets.

## Frontend files to update once each endpoint is ready

1. `src/services/home.service.ts` — replace mock implementations one endpoint at a time; leave `findServiceCategories` and category aliases as local search UX if desired.
2. `src/types/marketplace.ts` — align DTOs to the final resource fields; prefer adapting wire DTOs in services so components remain stable.
3. `src/mocks/marketplace.mock.ts` — remove sample data only for features switched to the API.
4. `src/features/home/HomePage.tsx` — keep loading, empty, and retry states; ensure request errors stay with their relevant section.
5. `src/features/services/SearchResultsPage.tsx` — preserve query/location filters and display API-provided results only after a successful response.
6. `docs/marketplace-api-contract.md` — change each “proposed” endpoint to “implemented” only after the route and feature tests pass.

## Feature test checklist

Add Laravel feature tests under `backend/tests/Feature/` for each endpoint:

- Guest receives `401`; an unverified account cannot call verified-only marketplace routes.
- User A cannot read/use User B's saved location, request, or private profile data.
- Categories exclude inactive records and follow deterministic order.
- Provider results match service and saved location; unpublished providers and private contact/address fields are excluded.
- `/me/requests` and `/me/notifications` return only the signed-in user's data; empty lists return `200` with `data: []`.
- Invalid query or body fields return `422`; pagination has a server-side maximum.

Run backend checks from the repository root:

```sh
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --class=ServiceCategorySeeder
docker compose exec backend php artisan route:list --path=api
docker compose exec backend php artisan test
```

Run these only after the corresponding migrations, seeder, and feature tests are added. Do not commit `.env` or API secrets; add only non-secret variable names and safe local defaults to `.env.example`.
