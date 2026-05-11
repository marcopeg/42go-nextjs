---
name: 42go-events-logging
description: Use when adding, changing, or reviewing event logging in this repository. Covers the core `events.events` schema, server writer, client tracker, AppConfig enablement, naming, payload safety, and export expectations.
---

# 42go Events Logging

Use the core events system for new event logging. Do not create app-local event tables or app-local event writers.

## Rules

- Server code records events through `src/42go/events/server.ts`.
- Client code records events through `src/42go/events/client.ts` or `useEventTracker()`.
- Event names should use dot namespace syntax, such as `user.login` or `page.open`.
- Do not repeat the app ID in app-owned event names. Events are already scoped by `app_id`.
- App-specific dimensions belong in `data`.
- Never store passwords, OAuth tokens, cookies, secrets, or full request headers in events.
- PostgreSQL is a hot buffer. Durable analytics come from `42go-events-export`.

## References

- Server writer: `references/server-writer.md`
- Client tracker: `references/client-tracker.md`
- Naming and payloads: `references/naming-payloads.md`
- Export workflow: `references/export-workflow.md`
