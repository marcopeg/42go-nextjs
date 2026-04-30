---
taskId: ACR
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-18T14:38:16+02:00
---

# quicklist - API: delete project [acr]

Implement DELETE /api/quicklists/:projectId to remove a project and cascade related data.

## Context

- Policy: require { feature: "api:quicklists", auth: true }
- Permissions: owner only
- DB has CASCADE on tasks/collabs/invites

## Goals

- [ ] Verify ownership
- [ ] Delete project
- [ ] Return 204

## Acceptance Criteria

- [ ] 204 No Content on success
- [ ] 403 for non-owners
- [ ] 404 when project not found or feature missing

## API Contract

DELETE /api/quicklists/:projectId

## Implementation Notes

- Access check: projects.owned_by = user.id
- Consider soft delete if needed (not in scope now)

## Next Steps

plan task (k2)
