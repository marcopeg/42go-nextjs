---
taskId: ABY
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-20T11:25:47+02:00
---

# quicklist - API: create project with initial task [aby]

Implement POST /api/quicklists to create a new project with a default title and an initial task.

## Context

- Policy: require { feature: "api:quicklists", auth: true }
- Defaults: title = "grocery list" (if missing), initialTaskTitle = "milk"
- Writes: projects (owned_by/created_by/updated_by = session.user.id) and tasks (position = 1)

## Goals

- [ ] Validate and sanitize input
- [ ] Transactional insert of project and first task
- [ ] Return created project id and title
- [ ] Bump updated_at appropriately

## Acceptance Criteria

- [ ] 201 JSON response: { id: string, title: string }
- [ ] On error: 400 invalid input, 401 unauthenticated, 403 forbidden, 404 feature missing
- [ ] Transaction rollback on partial failure

## API Contract

POST /api/quicklists

Body
{ "title": "optional", "initialTaskTitle": "optional" }

Response 201
{ "id": "uuid", "title": "string" }

## Implementation Notes

- Use getDB() and knex.transaction
- Schema-qualified tables: quicklist.projects, quicklist.tasks
- Set created_by/updated_by/owned_by = session.user.id

## Next Steps

plan task (k2)
