# quicklist - API: list projects and invites [abw]

Implement GET /api/quicklists to return projects for the current user and pending invites, secured by unified policy guard.

## Context

- Policy: require { feature: "api:quicklists", role: user }
- Data sources:
  - quicklist.projects owned_by = user.id plus projects via quicklist.collabs where user_id = user.id
  - quicklist.collabs joined by collabs.user_id = session.user.id
  - quicklist.invites filtered by email = session.user.email
- Pagination: optional limit (default 50, max 100) + opaque cursor based on updated_at,id

Examplle of the output:

```json
{
  "projects": [], // list of my own projects or prohects that i actively collaborate with
  "invites": [] // list of pending invites to participate into other people's projects
}
```

## Goals

- [ ] Protect with unified guard (404/401/403 semantics)
- [ ] Return combined list of owned/collab projects with role and ownership flag
- [ ] Include invites addressed to current user's email
- [ ] Support limit + cursor pagination; return nextCursor when applicable

## Acceptance Criteria

- [ ] 200 JSON response:
  - projects: [{ id, title, owned: boolean, role: "owner"|"editor"|"viewer", updated_at }]
  - invites: [{ project_id, email, title, created_at }]
  - nextCursor?: string
- [ ] Enforced access control and feature flag behavior
- [ ] Defensive limits (<= 100) and stable cursor encoding/decoding

## API Contract

GET /api/quicklists?limit=50&cursor=...

Response 200
{
"projects": [
{ "id": "uuid", "title": "string", "owned": true, "role": "owner", "updated_at": "ISO" }
],
"invites": [
{ "project_id": "uuid", "email": "user@example.com", "title": "string", "created_at": "ISO" }
],
"nextCursor": "string?"
}

Errors: 401 (no session), 403 (no permission), 404 (feature missing)

## Implementation Notes

- Use getDB() with schema-qualified tables
- Owned: projects.owned_by = user.id; Collab: join collabs on user_id
- Consider UNION + distinct on id or merge results with Map
- Index usage: idx_projects_owned_by, idx_collabs_user

## Next Steps

execute task (k3)

## Development Plan

Implementation contract

- Input: authenticated user with id and email; query params limit (<=100) and cursor (base64 "updated_at|id")
- Output: { projects: [{ id, title, owned, role, updated_at }], invites: [{ project_id, email, title, created_at }], nextCursor? }
- Errors: 401 no session, 403 missing role/grants, 404 feature disabled (via unified guard)

Steps

1. Route: create `src/app/api/quicklists/route.ts` with GET handler wrapped by `protectRoute`:

- Policy: `require: { feature: "api:quicklists", session: true, role: "user" }` (role name subject to app roles; adjust if different)

2. Parse query params from Request:

- `limit`: default 50, clamp to [1..100]
- `cursor`: base64 decode into `{ updatedAt: Date, id: uuid }`; ignore if invalid

3. DB access via `getDB()` (Knex, PostgreSQL).
4. Projects query (owned + collab) with dedupe and ordering:

- Owned: `quicklist.projects` where `owned_by = user.id` → columns: id, title, updated_at, role='owner', owned=true
- Collab: join `quicklist.collabs` on user_id, `quicklist.projects` on project_id → id, title, updated_at, role=collabs.role, owned=false
- UNION ALL the two subqueries
- Deduplicate by project id preferring owned rows, then newest:
  - `SELECT DISTINCT ON (id) * FROM (union) u ORDER BY id, owned DESC, updated_at DESC`
- Pagination stable order: `ORDER BY updated_at DESC, id DESC`
- If cursor present: add tuple filter `(updated_at, id) < (cursorUpdatedAt, cursorId)` via `.whereRaw`
- Fetch `limit + 1` rows; if extra, pop and emit `nextCursor` using last item's updated_at and id encoded to base64

5. Invites query for current user email:

- `quicklist.invites` join `quicklist.projects` by project_id
- Filter `email = session.user.email` and `(expires_at IS NULL OR expires_at > NOW())`
- Return `{ project_id, email, title, created_at }`

6. Response shape per acceptance criteria; dates as ISO strings (`toISOString()`).
7. Defensive coding:

- Validate/guard cursor parsing; on failure, ignore cursor (treat as first page)
- Clamp limit to 100; negative or NaN → default 50
- Ensure feature flag present in AppConfig (`features: ["api:quicklists", ...]`) — add during integration if missing

Type/utility notes

- Use schema-qualified tables via Knex (`db.withSchema('quicklist')` or fully-qualified in joins)
- Avoid DISTINCT without ORDER; rely on `DISTINCT ON (id)` with deterministic ORDER BY
- Use small helpers: `encodeCursor({updated_at,id})`, `decodeCursor(str)`

Edge cases

- User both owner and collab: prefer owner row (owned=true, role='owner')
- No invites: return empty array
- Large lists: union + distinct happens server-side; stable composite cursor prevents duplicates across pages

Validation

- Manual smoke with a seeded DB (user owns N projects, collabs on M, and has K invites)
- Verify 401 with no session; 404 when feature not enabled; 403 when role missing
