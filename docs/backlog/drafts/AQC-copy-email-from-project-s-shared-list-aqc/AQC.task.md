---
taskId: AQC
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Copy email from project's shared list [aqc]

Add a small UI affordance that allows copying the email address of a user that appears in the project's shared/collaborators list.

## Goals

- Add a copy-to-clipboard action next to user entries in shared list
- Ensure accessibility and mobile support
- Provide visual confirmation (tooltip/snackbar) on copy
- Add tests for the UI action

## Acceptance Criteria

- [ ] Copy action copies the user's email to clipboard reliably
- [ ] Works on desktop and mobile browsers
- [ ] Accessibility attributes present (aria-labels)
- [ ] Tests added and passing

## Development Plan

1. Find the shared/collaborators UI component (likely QuickList project header or collaborators panel)
2. Add a small button/icon near each user to perform copy
3. Implement copy behavior using navigator.clipboard with fallback
4. Add a temporary visual confirmation and tests

## Notes

- If emails are not present in the UI (only names), consider adding a hover/detail view to reveal email.
