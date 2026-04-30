---
title: Authorization
---

This document exposes **how resources are protected** in _NextKit_.

# Role Based Access Control

NextKit's _RBAC_ is composed by:

- **grants:** Is a single ACL entity that can be required to perform an action
- **roles:** Is a group of _grants_, roles are assigned to _users_ for a specific _AppID_
- **users:** Is an _actor_ in the system, and can assume any given role.

![Authorization Schema](/images/docs/authorization.png)

> **Example:**
>
> Editing a document requires the `doc:edit` grant.
>
> `Jane` has the role of `admin` and that role is associated with `doc:edit` therefore **JANE CAN** perform the action.
>
> `John` has the role of `user` and that role is NOT associated with `doc:edit` therefore **JOHN CAN NOT** perform the action.

## RBAC is App Specific

Grants and roles are global entities, they are just names and can be reused by many different Apps. An "admin" is a role that makes sense for a TodoApp and a Notebook app anyway.

But **the association** of `grant -> role` and `user -> role` is App specific.

It means that **what an "admin" can do** must be defined for each App. Also **what is John's role** must be re-defined for each App.

## Evaluate a Policy

```ts
const result = evaluatePolicy({
  requireFlag: "api/foo",
  requireRole: "admin",
  requireGrants: ["doc:write", "doc:read"], // require all
  requireAnyGrant: ["doc:write", "doc:read"], // stop at first match
});
```
