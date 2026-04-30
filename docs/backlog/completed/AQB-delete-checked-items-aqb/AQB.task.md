---
taskId: AQB
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-10-02T14:42:31+02:00
---

# Delete checked items [aqb]

Allow users to delete all checked/completed items in a list with a single API call and UI action.

## Goals

- Implement backend endpoint to bulk-delete completed tasks for a project/list
- Ensure authorization checks (project membership) are enforced
- Ensure deletion is transactional and returns the remaining items or new snapshot
- Add UI action/button to trigger bulk delete with confirmation
- Add tests for API and integration/UI
- Provide a ghost-style "Drop completed tasks" button fixed at the bottom of the task list (inside project view) that only appears when there is at least one completed task

## Acceptance Criteria

- [x] API endpoint to bulk-delete completed tasks exists (`POST /api/quicklists/:projectId/drop-completed`) removing checked tasks
- [x] Only authorized users (owner or collab) can perform the operation
- [x] UI exposes a clear action with confirmation
- [ ] Tests added and passing (PENDING)
- [x] A ghost (low-emphasis) button labeled "Drop completed tasks" is rendered at the bottom of the list ONLY when >= 1 completed task exists
- [x] Button disappears (not rendered) immediately after operation if no completed tasks remain
- [x] Button triggers confirmation (window.confirm) before deletion
- [x] Accessible: button has aria-label and keyboard focusable

## Development Plan

### Backend

1. Create new API route file: `src/app/api/quicklists/[projectId]/drop-completed/route.ts`
   - Method: `POST` (idempotent enough; returns remaining pending tasks + counts) OR `DELETE` variant. Choose `POST` because it's an action not tied to a specific resource id.
   - Feature guard: `api:quicklists` + session required (reuse `protectRoute`).
2. Access control: replicate ownership/collab check used in other project routes (`[projectId]/route.ts`).
3. Inside a transaction:
   - Select IDs (and positions) of completed tasks for the project: `SELECT id, position FROM quicklist.tasks WHERE project_id=? AND completed_at IS NOT NULL ORDER BY position`.
   - If none found: return `{ ok: true, deleted: 0, tasks: [] }` early.
   - Delete them: `await trx('quicklist.tasks').where({ project_id }).whereNotNull('completed_at').del()`.
   - Re-pack remaining tasks' positions: fetch remaining pending tasks ordered by current position, then reassign 1..N using a CTE or iterative updates. (Performance N is small; simple loop fine.)
   - Update `quicklist.projects.updated_at`.
   - Return JSON: `{ ok: true, deleted: <number>, tasks: [ {id,title,position,updated_at,completed_at:null}... ] }` (only pending tasks).
4. Consider race conditions: wrap whole operation in a single transaction and rely on row-level locks implicitly acquired by updates/deletes. (Future optimization: explicit `FOR UPDATE`).
5. Add minimal zod param validation for `projectId` (UUID test) mirroring existing code.

### Frontend Hook Extension

6. Extend `useQuicklistData.ts`:
   - Add derived boolean: `hasCompleted = tasks.some(t => t.completed_at)`.
   - Add `handleDropCompleted = async () => { confirm; optimistic remove completed; call API; if fail -> refetch }`.
   - When success: replace tasks state with returned `tasks` list (pending tasks only).
   - Ensure movingDownIds cleared.

### UI Integration

7. Add ghost button in the project view page (where tasks list is rendered). Likely in the component that renders `TasksList` (search for usage). If list component should own it, optionally extend `TasksList` with a `footer` slot.
8. Styling: Tailwind classes: `mt-4 mb-6 text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition` (no border). Wrap in a `<button type="button">`.
9. Conditional render: only when `hasCompleted` is true.
10. On click: open `window.confirm("Drop all completed tasks?")` (simple) or use existing toast/alert pattern if available (future enhancement).

### UX & Accessibility

11. Add `aria-label="Drop completed tasks"` and `title` attribute.
12. Disable button while request in-flight; show spinner (reuse small inline spinner component if exists, else just change text to `Dropping...`).

### Caching & State

13. After success: do NOT refetch immediately; rely on returned tasks. Optionally invalidate project cache to refresh freshness/etag: `invalidateProjectCache(projectId, { droppedCompleted: true })`.
14. Ensure project updated_at is reflected later (refetch on next navigation or manual refresh). Optionally call `refreshData()` after short debounce.

### Tests

15. Unit/Integration (API):
    - Scenario: no completed tasks -> deleted=0.
    - Scenario: some completed tasks -> returns expected count; ensures remaining tasks positions are contiguous starting at 1 and order preserved relative to original pending sequence.
    - Access control: non-member 404/401.
16. Hook/UI test (if infra present): simulate tasks with completed and confirm button hides after action.

### Edge Cases

17. All tasks completed -> after deletion returns empty list; button disappears.
18. Concurrent completion toggles while request in flight -> backend still consistent; frontend may refetch on mismatch.
19. Very large lists: consider doing re-pack with single SQL using window function; postponed until needed.

### Rollout

20. Implement backend first, manual curl test.
21. Add hook + UI, manual browser test.
22. Add tests, run `npm run qa` until clean.
23. Update docs (optional: quicklist feature doc) with new bulk clear action.

## Progress

- Implemented backend route `drop-completed` with transactional delete + position compaction.
- Added hook extensions: `hasCompleted`, `handleDropCompleted` with optimistic update & error recovery.
- Integrated ghost button into project page UI conditionally.
- Build & lint pass (`npm run qa`).
- Remaining: add tests (API + maybe basic UI) and optional docs update.

### Next Steps

execute task (k3)

UI specifics to implement in step 3.

## Notes

- Consider soft-delete vs hard-delete depending on expected UX and auditing needs.
- Ghost button styling: minimal border / subtle text (tailwind e.g. `text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`) to avoid accidental clicks but visible.
- Placement: anchored after the last task element inside the scroll area; if virtualized list, render in a footer slot.
- Logic: compute `hasCompleted = tasks.some(t => t.completed)`; conditional render.
- After successful deletion, optimistic update removes completed tasks, re-check condition to hide button without extra fetch.
