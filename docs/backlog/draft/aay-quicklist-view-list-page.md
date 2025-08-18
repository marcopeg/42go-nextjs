# quicklist - view list page [aay]

Create a page to view a specific quicklist project with real-time updates.

## Context

- Route: `/quicklists/[id]` under the `(app)` group
- Convention: client-only page using `AppLayout` for policy and layout chrome
- Policy: `policy={{ require: { feature: "page:quicklists" } }}` via `AppLayout`
- Data: `GET /api/quicklists/:id` (task [acc]) returns project metadata and tasks with etag support

**Backend API Details (from task [acc]):**

- Endpoint: `/api/quicklists/[projectId]` (fully implemented ✅)
- Response includes `etag` field in JSON body for easy client access
- ETag format: Simple timestamp `YYMMDDhhmmss` (e.g., "250816123045")
- Supports both header (`If-None-Match`) and query param (`?t=etag`) conditional fetching
- Returns 304 when etag matches, 200 with full data when changed
- Access control: user must be owner or collaborator
- Tasks pre-sorted by `position ASC, created_at ASC`

## Goals

- [ ] Display project title in AppLayout's top bar
- [ ] Render tasks list in page body with proper styling
- [ ] Implement 5-second polling with conditional updates (304 handling)
- [ ] Handle loading states, empty lists, and error scenarios

## Acceptance Criteria

- [ ] Page scaffolded at `src/app/(app)/quicklists/[id]/page.tsx` as client component
- [ ] Uses `AppLayout` with dynamic title: `title={projectData?.project?.title || "Loading..."}`
- [ ] Policy enforced: `policy={{ require: { feature: "page:quicklists" } }}`
- [ ] Fetches data using conditional ETag: `GET /api/quicklists/:id?t=${etag}` every 5 seconds
- [ ] Tasks rendered as list with title, position, completion status
- [ ] Loading spinner on initial load; no UI flicker on 304 responses
- [ ] Empty state when no tasks exist
- [ ] Error handling for 404/403/network failures
- [ ] Cleanup polling on component unmount

## Implementation Details

### Data Flow

1. Initial fetch: `GET /api/quicklists/:id` → store `response.etag` from JSON body
2. Polling: `GET /api/quicklists/:id?t=${etag}` every 5 seconds
3. 200 response → update UI + store new `response.etag`
4. 304 response → ignore (no UI update needed, etag unchanged)

**API Response Shape:**

````json
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

### UI Structure
```tsx
<AppLayout title={projectData?.project?.title || "Loading..."} policy={{...}}>
  <div className="max-w-3xl mx-auto w-full p-4">
    {loading && <LoadingSpinner />}
    {error && <ErrorMessage />}
    {projectData && (
      <>
        <ProjectMeta project={projectData.project} />
        <TasksList tasks={projectData.tasks} />
        {projectData.tasks.length === 0 && <EmptyState />}
      </>
    )}
  </div>
</AppLayout>
````

### Polling Hook

- Custom hook: `useQuicklistPolling(projectId, intervalMs = 5000)`
- Returns: `{ data, loading, error, isPolling }`
- Handles: etag storage in state, 304 responses, cleanup on unmount, error recovery
- **Key Implementation**: Use `response.etag` from JSON body (not headers) for next poll
- **Query Parameter**: Always use `?t=${etag}` format for conditional requests
- **304 Handling**: Ignore 304 responses completely, don't update state or trigger re-renders

## Next Steps

plan task (k2)
