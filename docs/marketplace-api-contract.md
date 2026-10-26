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

### `PUT /api/admin/account/password`

- Purpose: the signed-in administrator changes their own password from the admin console's "Password & sign-in" page **without entering the current password**. To make up for the missing check, every successful change emails the admin. The customer route `PUT /api/account/password` and `ChangePasswordRequest` stay unchanged and still require `current_password`.
- Body: `{ password: string, password_confirmation: string }`. There is no `current_password` field; if a client sends one, it is ignored.
- Expected response: `200 { message: "Password updated. Other devices were signed out." }`.
- Validation (`422 { message, errors }`), in a new Form Request:
  - `password` is required, a string, at least 12 characters (`Password::min(12)`, matching the customer rule) and `confirmed`.
  - If `password` matches the admin's current password (`Hash::check`), return the error on `password`: "Choose a new password that is different from your current one."
- Authorization: register the route inside the existing admin group (`auth:sanctum`, `verified`, `account.active`, `admin`, prefix `admin`) with `throttle:6,1` and **no** `admin.permission:*` middleware, because every administrator manages their own sign-in. A non-admin gets `403`, a guest gets `401`, and too many attempts gets `429`. The route acts only on `$request->user()` and never takes a user id.
- Side effects, same as `AccountSecurityController::updatePassword`:
  - Save the hashed password.
  - Delete the user's other rows in the sessions table.
  - Rotate the remember token.
  - Regenerate the current session.
  - Record `PASSWORD_CHANGED` through `SecurityAuditLogger`.
- Email alert (new): after the password is saved, send a mail notification (`App\Notifications\AdminPasswordChanged`) to the admin's own account email.
  - Subject: "Your AYOS admin password was changed".
  - Body: the date and time of the change (Asia/Manila), the request's IP address and a short device description (iPhone, Mac, Windows PC, etc.), and "If this wasn't you, reset your password from the sign-in page right away and contact the AYOS operations team."
  - Never include the password or any token.
  - If sending fails, log the error and still return `200`: the change already happened, and a mail outage must not break it.
- UI states (admin "Password & sign-in" page; the frontend for this is already in the working tree):
  - Fields: "New password" and "Confirm new password" only.
  - Loading: the button reads "Updating…" and is disabled.
  - Success: show the success message and clear the form.
  - Errors: `422` field errors appear under their fields, and any other field's error appears above the button. `429` shows "Too many attempts. Wait a minute, then try again." `404` (route not deployed) shows "Password changes aren’t available right now. Please try again later."

### `POST /api/admin/administrators`

- Purpose: a super admin or administrator creates another administrator account from the admin console's "Admin security" section, choosing its first password and sharing it privately.
- Permission: `admins.manage`, granted to the `super_admin` and `admin` roles (migration `add_admins_manage_permission`). Other admins get `403`. Limited to 10 requests a minute (`429`).
- Body: `{ name, email, mobile_number, role, password, password_confirmation }`.
- Validation (`422 { message, errors }`, `Admin\CreateAdministratorRequest`):
  - `email` is trimmed and lowercased, then must be unique: "An AYOS account already uses this email."
  - `mobile_number` has spaces, dots, dashes and brackets removed, then must match `^\+?[0-9]{7,32}$`: "Enter a valid mobile number, like +63 917 123 4567."
  - `role` must be one the creator may assign. Only a super admin may assign `super_admin`; an administrator may assign `admin`, `moderator` or `support`.
  - `password` uses the registration rules: at least 12 characters, at least one symbol, `confirmed`.
- Side effects: the account is created with a verified email (the creator vouches for it, as with `ayos:bootstrap-admin`), the role is attached with `assigned_by` set to the creator, and `ADMIN_ACCOUNT_CREATED` is recorded for the creator with `{ target_user_id, role }`.
- Response: `201 { data: { id, name, email, role } }`.
- `GET /api/admin/security` now also returns `assignableRoles: { slug, name }[]`: the roles the signed-in admin may assign, or an empty list without `admins.manage`. The console shows "Add administrator" only when the list isn't empty.
