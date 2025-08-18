# quicklist - invite collaborator [aba]

Implement the ability to invite collaborators to a QuickList list.

## Context

- Surface: list details page under `(app)` using `AppLayout`
- Convention: client-only UI powered by API calls
- Data/APIs:
  - `POST /api/quicklists/:id/invites` to create an invite
  - `GET /api/quicklists/:id/invites` to list invites (optional)
  - `DELETE /api/quicklists/:id/invites/:inviteId` to revoke
  - Invite acceptance flow may be handled elsewhere (link in email)

## Goals

- [ ] Add UI for inviting collaborators (email input, role select)
- [ ] Send invitation via API; handle pending state and errors
- [ ] Manage collaborators (list pending invites, revoke)

## Acceptance Criteria

- [ ] Collaborators can be invited
- [ ] Invitations are sent and visible as pending
- [ ] Collaborators can be managed (revoke)

## Notes

- Keep the form and list in the details page as a panel/section
- Respect policy: only owners/editors can invite; enforce via policy in API and conditionally render UI client-side
