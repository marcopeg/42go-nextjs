---
taskId: ACS
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-20T11:25:47+02:00
---

# Test API [acs]

See the full step-by-step guide: [POSTMAN.md](../../../articles/POSTMAN.md)

You want to punch APIs with curl and Postman like they owe you money. We'll log in, grab cookies, and hit protected routes across apps.

## Why

Replicate authenticated API calls outside the browser. Validate feature flags and policies (404/401/403) and exercise app scoping via headers.

## Context

- Auth: NextAuth (JWT sessions via HTTP-only cookie)
- Credentials provider fields: username, password
- CSRF required for credential login
- Cookie name: `next-auth.session-token` (HTTP) or `__Secure-next-auth.session-token` (HTTPS)
- Multi-app header: `X-42Go-AppID`
- Seed users: `john/john`, `jane/jane`

## Goals

- Curl recipe to authenticate and persist session cookie
- Curl recipe to call protected APIs with app scoping
- Postman collection setup (env vars + pre-req to fetch CSRF + login)
- Document policy outcomes: 404 (feature), 401 (session), 403 (role/grant)

## Acceptance Criteria

- [x] Curl can login via credentials and store session cookie
- [x] Curl can call a protected endpoint (e.g., `/api/quicklists`) returning 200 when allowed
- [x] Curl shows correct failures: 401 without cookie; 404 if feature disabled for app; 403 when forbidden
- [x] Postman guide created with environment variables and working login + sample calls
- [x] Notes cover host-based app matching and HTTPS cookie name

## Progress

- Added `docs/articles/POSTMAN.md` with a host-based flow using `quicklist.localhost`.
- Replaced brittle pre-request CSRF with a dedicated CSRF request that:
  - persists cookies to the jar, and
  - stores `csrfToken` via collection variables.
- Provided curl equivalents for CSRF → Login → Session → API → Logout.
- Verified `api:quicklists` is guarded and present in Quicklist app config.

## Issues Encountered

- Postman pre-request `pm.sendRequest` didn’t consistently stash CSRF cookies into the main jar. Result: login set no session cookie.
- Fix: use a normal CSRF request + Tests script to set `csrfToken`, then login. Cookies persist correctly.

## Architectural Decisions

- Prefer URL-based app matching (`*.localhost`) over custom headers in tools.
- Keep cookies host-consistent across all requests.

## Next Steps

complete task (k4)
