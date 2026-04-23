---
taskId: AAZ
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-20T11:25:47+02:00
---

# quicklist - edit list page [aaz]

Implement editing functionality for a QuickList list.

## Context

- Route: `/quicklists/[id]/edit` under the `(app)` group
- Convention: client-only page using `AppLayout` for policy and UI chrome
- Policy: `policy={{ require: { feature: "page:quicklists" } }}` via `AppLayout`
- Data/APIs: `PATCH /api/quicklists/:id` for metadata, tasks CRUD via related endpoints (see [acg] update task, [ack] delete task)

## Goals

- [ ] Add UI for editing list (title and tasks)
- [ ] Persist changes to database via API
- [ ] Validate input (required title, task constraints)

## Acceptance Criteria

- [ ] List can be edited from UI
- [ ] Changes are saved in database
- [ ] Input validation works with error display and disabled states

## Notes

- Use optimistic UI where sensible; rollback on error
- Keep edits client-side, only persist via API calls
- Include toolbar actions: Save, Cancel (and possibly Delete linked to [acr])
