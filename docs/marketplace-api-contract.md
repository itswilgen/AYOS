# AYOS marketplace frontend API handoff

The authenticated home currently uses typed services as its UI boundary. Profile and saved locations already call the Laravel endpoints below. Categories, provider discovery, requests, and notifications return isolated sample data until the corresponding marketplace API is available.

## Existing endpoints used by the frontend

### `GET /api/me/profile` and `PATCH /api/me/profile`

- The GET response is a Laravel resource with `data: { id, name, display_name, email, email_verified, mobile_number }`.
- PATCH sends `{ name, display_name }` and returns the updated resource.
- The profile page shows a loading state, a retryable connection error, and a saved confirmation. Email and mobile stay read-only until supported update flows exist.

### `GET /api/me/service-locations`

- Returns `data: ServiceLocationSummary[]`, sorted with the default location first.
- Each item includes `id`, `label`, `is_default`, region/province/city/barangay codes and names, and the saved address fields.
- The home shows only the location label, barangay, city, and province. It never prints the street address.

### `POST /api/me/service-locations`, `PUT /api/me/service-locations/{id}`, `DELETE /api/me/service-locations/{id}`, and `POST /api/me/service-locations/{id}/default`

- Create/update sends `label`, `region_code`, optional `province_code`, `city_municipality_code`, `barangay_code`, `address_line`, optional `landmark` and `postal_code`, and `is_default`.
- Create/update return `data: ServiceLocationSummary`; delete returns `204`; default selection returns the updated resource.
- Region references use `GET /api/locations/regions`, then the existing region/province/city/barangay reference routes. Each lookup returns `data: LocationOption[]`.
- The form shows inline validation feedback; the list has loading, empty, retry, save, default, and delete states.

## Proposed marketplace endpoints

The response shapes below are frontend expectations, not existing server routes. Keep the service interfaces stable and replace the sample adapters in `src/services/home.service.ts` when backend contracts are agreed.

### `GET /api/services`

- Expected response: `{ data: ServiceCategory[] }`, where a category has `id`, `slug`, `name`, `shortDescription`, and an optional icon key.
- Query: none initially; later may support active/featured filters.
- Loading: show a compact section placeholder. Empty/error: show a retry action.

### `GET /api/providers/search?service={query}&location_id={id}`

- Expected response: `{ data: ProviderSummary[] }` with display name, service categories, broad service-area label, optional rating/review counts, completed-service count, verification status, and availability.
- Search input is a service/category phrase; `location_id` must refer to one of the signed-in user’s saved service locations.
- Empty: explain that no providers match and let the customer choose another service or location. Error: preserve the current filters and offer retry.
- Do not return private street addresses or unsupported license/guarantee claims in provider previews.

### `GET /api/me/requests?status=active`

- Expected response: `{ data: ServiceRequestSummary[] }` with request id, service name, status, broad location label, and last-updated timestamp.
- Empty: “No service requests yet.” Loading/error states remain localized to the activity section.

### `GET /api/me/notifications`

- Expected response: `{ data: NotificationSummary[] }` with id, title, description, created timestamp, and unread state.
- Empty: show “You’re all caught up.” The bell count should only reflect server-provided unread items.
