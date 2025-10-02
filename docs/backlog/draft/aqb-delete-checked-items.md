# Delete checked items [aqb]

Allow users to delete all checked/completed items in a list with a single API call and UI action.

## Goals

- Implement backend endpoint to bulk-delete completed tasks for a project/list
- Ensure authorization checks (project membership) are enforced
- Ensure deletion is transactional and returns the remaining items or new snapshot
- Add UI action/button to trigger bulk delete with confirmation
- Add tests for API and integration/UI

## Acceptance Criteria

- [ ] API `DELETE /api/quicklists/:id/tasks?completed=true` (or similar) removes checked tasks
- [ ] Only authorized users can perform the operation
- [ ] UI exposes a clear action with confirmation
- [ ] Tests added and passing

## Development Plan

1. Locate quicklist tasks API and DB layer
2. Add endpoint and route, perform deletion within a transaction
3. Add UI button in the list page, with confirmation modal
4. Add tests and run `npm run qa`

## Notes

- Consider soft-delete vs hard-delete depending on expected UX and auditing needs.
