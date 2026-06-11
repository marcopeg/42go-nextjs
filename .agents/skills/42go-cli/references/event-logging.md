# 42Go Event Logging Expectations

Use this reference when checking whether application events will be useful to the CLI archive and query pipeline.

## Core Rule

Use the shared core events system. Do not create app-local event tables or app-local event writers.

## Writers

- Server code records events through `src/42go/events/server.ts`.
- Client code records events through `src/42go/events/client.ts` or `useEventTracker()`.
- Durable local analytics come from `42go pull events`, not direct production reads during analysis.

## Naming

- Use dot namespace syntax, such as `user.login`, `page.open`, `page.scroll`, or `page.translate`.
- Do not repeat the app ID in app-owned event names. Events are already scoped by `app_id`.
- Keep names stable. Query commands group by exact event names.

## Payloads

- App-specific dimensions belong in `data`.
- For LingoCafe reading analytics, useful dimensions include:
  - `book_id`
  - `page_id`
  - `progress_bps`
  - `sentence_id`
  - translation language/cache fields where relevant
- Never store passwords, OAuth tokens, cookies, secrets, or full request headers.

## Query Compatibility

`42go query lingocafe reads` currently recognizes book context from:

- `data.book_id`
- `data.page_id`
- explicit read/book event names
- names containing `book`

Reading activity is currently counted from:

- `page.open`
- `page.scroll`
- `page.translate`

Changing these contracts requires updating CLI query code, tests, and this skill.
