# quicklist - support check/uncheck task in UI [act]

Add support for toggling a task's completion status directly from the quicklist task list UI.

## Goals

- [ ] User can check/uncheck a task in the list
- [ ] UI updates instantly on toggle
- [ ] API call updates backend status
- [ ] Error handling for failed updates

## Acceptance Criteria

- [ ] Checkbox or icon toggles completion
- [ ] Visual feedback for completed/incomplete
- [ ] API PATCH to update completed_at
- [ ] Optimistic UI update
- [ ] Error message on failure
