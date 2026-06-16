# 42Go Event Logging Expectations

Use this reference when checking whether application events will be useful after `42go pull events` archives them locally.

## Core Rule

Use the shared core events system. Do not create app-local event tables or app-local event writers.

## Writers

- Server code records events through `src/42go/events/server.ts`.
- Client code records events through `src/42go/events/client.ts` or `useEventTracker()`.
- Durable local analysis should start from `42go pull events`, not direct production reads.

## Naming

- Use dot namespace syntax, such as `user.login`, `page.open`, `page.scroll`, or `page.translate`.
- Do not repeat the app ID in app-owned event names. Events are already scoped by `app_id`.
- Keep names stable. Future aggregations will group by exact event names.

## Payloads

- App-specific dimensions belong in `data`.
- For LingoCafe reading analytics, useful dimensions include:
  - `book_id`
  - `page_id`
  - `progress_bps`
  - `sentence_id`
  - translation language/cache fields where relevant
- Never store passwords, OAuth tokens, cookies, secrets, or full request headers.

## Future Aggregation Compatibility

LingoCafe reading analysis should be able to infer book context from:

- `data.book_id`
- `data.page_id`
- explicit read/book event names
- names containing `book`

Reading activity should be derivable from:

- `page.open`
- `page.scroll`
- `page.translate`

Changing these contracts requires updating future aggregation code, tests, and this skill.
