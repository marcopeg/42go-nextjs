# quicklist — API: get project with tasks (conditional) [acc]

Serve GET /api/quicklists/:projectId returning a single project and its tasks. Support conditional fetch with ETag and Last-Modified.

## Context

- Feature gate: require { feature: "api:quicklists", auth: true }
- Data model (schema quicklist): - projects(id, title, created_at, updated_at, created_by, owned_by, updated_by) - tasks(id, project_id, title, position, created_at, updated_at, created_by, completed_at, completed_by) - collabs(project_id, user_id, role)
- Access: requester must be project.owned_by OR in collabs for that project.

## Goals

- [ ] 304 Not Modified when resource freshness unchanged
- [ ] 200 OK returns payload + ETag + Last-Modified headers
- [ ] Tasks ordered deterministically by position ASC, created_at ASC

## Acceptance Criteria

- [x] Route: GET /api/quicklists/:projectId where :projectId is UUID (400 if not UUID)
- [x] Auth/feature: - 401 if unauthenticated - 404 if project not found OR requester lacks access (anti-enumeration)
- [x] Conditional caching: - Use ETag precedence over If-Modified-Since when both present - ETag represents resource freshness of the project WITH its tasks - Last-Modified equals the resource freshness timestamp (UTC, RFC 1123) - 304 when If-None-Match matches current ETag OR If-Modified-Since >= freshness
- [x] 200 response shape (ISO 8601 timestamps for JSON fields):
      {
      "etag": "250816123045",
      "project": {
      "id": "uuid",
      "title": "string",
      "created_at": "ISO",
      "updated_at": "ISO"
      },
      "tasks": [
      {
      "id": "uuid",
      "title": "string",
      "position": 0,
      "updated_at": "ISO",
      "completed_at": "ISO|null"
      }
      ]
      }
- [x] Headers on 200: - ETag: <timestamp> (no weak prefix, simple format) - Last-Modified: <RFC1123 date> - Cache-Control: private, must-revalidate
- [x] Sorting: tasks ORDER BY position ASC, created_at ASC

## API Contract

GET /api/quicklists/:projectId

Optional request headers: If-None-Match, If-Modified-Since

## Implementation Notes

**COMPLETED IMPLEMENTATION:**

- Freshness timestamp: compute GREATEST(p.updated_at, MAX(t.updated_at), MAX(t.completed_at)) for the project scope
- ETag: Simple timestamp format YYMMDDhhmmss (e.g., "250816123045" for Aug 16, 2025 12:30:45 UTC)
- Last-Modified: new Date(freshness).toUTCString()
- Access check: WHERE p.owned_by = :user OR EXISTS(collabs WHERE user_id = :user AND project_id = p.id)
- Return only public fields listed above (no created_by/owned_by in payload)
- Validate UUID param; respond 400 for invalid format
- **ETag in response body**: Added "etag" field to JSON response for client convenience
- **Query param support**: Supports ?t=<etag> for conditional fetch (in addition to If-None-Match header)
- **Debug logging**: Console logs project freshness and etag for debugging
- **Simple string comparison**: ETag comparison uses direct string match (no quotes/weak prefix handling needed)

**Key Implementation Details:**

- Route: `/src/app/api/quicklists/[projectId]/route.ts`
- Uses `protectRoute` with feature gate `api:quicklists` and session requirement
- Two SQL queries: freshness calculation + tasks list
- Tasks ordered by `position ASC, created_at ASC`
- 304 responses include ETag and Last-Modified headers
- Supports both header-based and query-param conditional fetching

## Non-Goals

- No invites or collabs listing in this endpoint
- No pagination (tasks are small per project)

## Next Steps

**TASK COMPLETED** ✅

This API endpoint has been fully implemented and tested. Key features:

- Conditional caching with ETag support (timestamp format)
- Access control via ownership or collaboration
- Query parameter support for client-friendly polling
- ETag included in response body for easy client access

Ready for frontend integration. See task [aay] for the UI implementation.
