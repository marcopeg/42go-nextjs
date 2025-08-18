# API Testing with Postman

No magic. Just Postman. You’ll log in, keep the cookie, and hammer protected routes. Then you’ll destroy the session and do it again as another user.

## Prerequisites

- Server running locally (default `http://localhost:3000`)
- Seed users: `john/john`, `jane/jane`

## Environment Setup (URL-based matching)

- App selection is resolved by host. No custom headers needed.
- Use an app-specific host in `baseUrl`. For Quicklist:
  - `baseUrl` → `http://quicklist.localhost:3000`
- Also add:
  - `username` → `john`
  - `password` → `john`
- Do NOT prefill `csrfToken` in Environment. We’ll set it automatically as a Collection variable.
- Ensure “Automatically follow redirects” is enabled.
- Cookies are per host. Keep the same `baseUrl` host across all requests.

---

## Step 1 — Fetch CSRF (normal request, sets variable + cookie)

Create a request “Auth / CSRF”.

- Method: GET
- URL: `{{baseUrl}}/api/auth/csrf`
- Tests (auto-store the token):

```javascript
try {
  const data = pm.response.json();
  pm.collectionVariables.set("csrfToken", data.csrfToken);
} catch (e) {
  console.log("Failed to parse CSRF JSON", e);
}
```

Send it. This does two things:

- Saves `csrfToken` at Collection scope (use `{{csrfToken}}` in later requests)
- Stashes the CSRF cookie in the jar for `quicklist.localhost`

---

## Step 2 — Login (Credentials)

Create a request “Auth / Login”.

- Method: POST
- URL: `{{baseUrl}}/api/auth/callback/credentials`
- Body: `x-www-form-urlencoded`
  - `csrfToken`: `{{csrfToken}}`
  - `username`: `{{username}}`
  - `password`: `{{password}}`
  - `callbackUrl`: `{{baseUrl}}/`
- No pre-request script. You already fetched CSRF in Step 1.

Send the request. Postman stores the session cookie automatically (for `quicklist.localhost`).

Curl (copy/paste):

```zsh
# Variables
BASE_URL=${BASE_URL:-http://quicklist.localhost:3000}
USER=${USER:-john}
PASS=${PASS:-john}
JAR=${JAR:-.cookies}

# 1) Get CSRF (stores initial cookies too)
CSRF=$(curl -s -c "$JAR" "$BASE_URL/api/auth/csrf" | jq -r '.csrfToken')

# 2) Login with credentials (follow redirects, keep cookies)
curl -s -L -b "$JAR" -c "$JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "csrfToken=$CSRF&username=$USER&password=$PASS&callbackUrl=$BASE_URL/" \
  "$BASE_URL/api/auth/callback/credentials" | cat
```

Note: Curl snippet uses `jq` to parse JSON. If you don’t have it, run the CSRF request and paste the token manually.

---

## Step 3 — Verify Session

Create a request “Auth / Session”.

- Method: GET
- URL: `{{baseUrl}}/api/auth/session`

Send it. Expect JSON with `user` details. If you get 401 or `{}`, the cookie isn’t set for this host.

Curl:

```zsh
curl -s -b "$JAR" "$BASE_URL/api/auth/session" | cat
```

---

## Step 4 — Call a Protected API

Example: List quicklists.

- Method: GET
- URL: `{{baseUrl}}/api/quicklists`

Expect 200 OK if:

- Feature `api:quicklists` is enabled for the app
- You’re authenticated
- Policy allows it

Curl:

```zsh
curl -s -b "$JAR" "$BASE_URL/api/quicklists" | cat
```

Expected failure modes:

- 401 Unauthorized → No session cookie
- 404 Not Found → Host doesn’t match an app with the feature
- 403 Forbidden → Auth OK, but role/grant check failed

---

## Step 5 — Destroy Session (Logout)

Two options:

A) Reuse the CSRF request

- Run “Auth / CSRF” again (Step 1) to refresh `{{csrfToken}}`
- Create a request “Auth / Logout”:
  - Method: POST
  - URL: `{{baseUrl}}/api/auth/signout`
  - Body: `x-www-form-urlencoded`
    - `csrfToken`: `{{csrfToken}}`
    - `callbackUrl`: `{{baseUrl}}/`
- Send it. Postman will clear the session cookie when NextAuth signals signout.

B) Pre-request for Logout (alternate)

- Add a Pre-request Script to “Auth / Logout” to fetch CSRF and set the collection var:

```javascript
pm.sendRequest(
  {
    url: pm.environment.get("baseUrl") + "/api/auth/csrf",
    method: "GET",
  },
  (err, res) => {
    if (err) {
      console.log("CSRF error", err);
      return;
    }
    try {
      const data = res.json();
      pm.collectionVariables.set("csrfToken", data.csrfToken);
    } catch (e) {
      console.log("Failed to parse CSRF JSON", e);
    }
  }
);
```

Curl:

```zsh
# Refresh CSRF while authenticated
CSRF=$(curl -s -b "$JAR" -c "$JAR" "$BASE_URL/api/auth/csrf" | jq -r '.csrfToken')

# Sign out
curl -s -L -b "$JAR" -c "$JAR" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "csrfToken=$CSRF&callbackUrl=$BASE_URL/" \
  "$BASE_URL/api/auth/signout" | cat

# Optionally nuke local cookie jar
rm -f "$JAR"
```

---

## Step 6 — Switch User / Switch App

- Switch user: change `username` / `password` and repeat Steps 1–4.
- Switch app: change `baseUrl` host to the app’s host (e.g., `http://default.localhost:3000`) and repeat.

---

## Optional — One-click Runner

- In “Auth / CSRF” Tests, add: `postman.setNextRequest('Auth / Login');`
- In “Auth / Login” Tests, add: `postman.setNextRequest(null);`
- Put the requests in a folder. Run the folder in Collection Runner.

---

## Tips & Troubleshooting

- `*.localhost` resolves to `127.0.0.1` on modern systems. `quicklist.localhost` works on macOS.
- Cookies are host-scoped. Use the same `baseUrl` host for CSRF, Login, Session, and API calls.
- If session shows `{}`: you’re not logged in for this host.
- If CSRF keeps failing: confirm the host in the CSRF call matches `baseUrl`.
- If you hit 404: your host doesn’t match an app or the feature isn’t enabled for that app.
