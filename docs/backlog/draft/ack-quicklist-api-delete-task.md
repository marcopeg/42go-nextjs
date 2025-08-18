# quicklist - API: delete task [ack]

Implement DELETE /api/quicklists/:projectId/:itemId to remove a task.

## Context

- Policy: require { feature: "api:quicklists", auth: true }
- Permissions: owner or collaborator

## Goals

- [ ] Delete task by id within project
- [ ] Optionally normalize positions after delete
- [ ] Bump project.updated_at

## Acceptance Criteria

- [ ] 204 No Content on success
- [ ] 404 if task not found or no access; 401/403/404 per policy

## API Contract

DELETE /api/quicklists/:projectId/:itemId

## Implementation Notes

- Use transaction if reindexing
- Ensure project_id match and access check prior to delete

## Next Steps

plan task (k2)
