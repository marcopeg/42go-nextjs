# Notifications and App Communications

42Go stores user-directed content as an app-scoped **communication**. “Notification” is the user-facing route and backoffice vocabulary. The broader storage name leaves room for channels that do not render in the app.

## Availability and access

Each app opts in with two exact feature flags:

```ts
features: ["page:notifications", "api:notifications"];
```

- `page:notifications` enables `/notifications` and `/backoffice/notifications`.
- `api:notifications` enables `/api/notifications` and `/api/backoffice/notifications`.
- User APIs additionally require an authenticated session and always derive the current app and user on the server.
- Backoffice APIs additionally require the `backoffice` role and the exact grant needed by the operation.

The app-scoped backoffice grants are:

- `notifications:list`
- `notifications:create`
- `notifications:edit`
- `notifications:publish`
- `notifications:delete`

The migration creates these grants for existing app-scoped backoffice roles. The final notification seed restores them after test seeds.

## AppConfig

```ts
app: {
  notifications: {
    showInProfile: true,
    showHistoryLink: false,
  },
}
```

`showInProfile` defaults to `true`, but the profile only renders the container when `api:notifications` exists. `showHistoryLink` defaults to `false`; the component shows the link only when this option is true and `page:notifications` exists. Explicit placements are independent of profile placement.

Authenticated app pages remain client-only. They use browser fetch with same-origin credentials.

## Routes

| Surface | Route | Policy |
| --- | --- | --- |
| In-app queue and actions | `/api/notifications` | feature + session + derived app/user |
| User active/history page | `/notifications` | page feature + session |
| Backoffice API | `/api/backoffice/notifications` | feature + session + backoffice + exact grant |
| Backoffice page | `/backoffice/notifications` | page feature + session + backoffice + list grant |

The user history API returns ten records at a time with a cursor and `Load more`. It contains final reactions, responses, and skips. Aborted/deleted records are excluded. Published email records are never returned to the in-app queue.

## Storage model

All tables live in the quoted PostgreSQL schema `"42go_data"`:

- `communications`: root content, channel, kind, style, priority, audience mode, interaction configuration, creator, schedule, and lifecycle.
- `communication_audience`: normalized selected users for whitelist or blacklist mode.
- `communication_user_state`: one app/message/user row with first qualified display and final reaction/response/skip.
- `communication_display_events`: append-only qualified-display timestamps, unique per component visit.

Audience, state, and event rows repeat `app_id`. Composite foreign keys bind each message and user reference to the same app. Communication deletion cascades all dependent rows. Deleting a creator sets `created_by` to null.

Indexes support both directions: users for one communication and communications for one user. Eligibility indexes cover app, channel, publication, abortion, availability, priority, and publication time.

## Channels, kinds, style, and priority

- Channel: `in_app` or `email`.
- Immutable kind: `notification`, `poll`, `input`, or `email`.
- Style: `info`, `warning`, `danger`, or `success`; presentation only.
- In-app priority: Low `0`, Normal `5`, High `10`. Email priority is null.

Eligible in-app items sort by priority descending, then publication time descending.

Email can be drafted, targeted, scheduled, published, aborted, inspected, and deleted. This release does not send it. A future external consumer can query published email rows and add templates/delivery reporting without changing the root model.

## Lifecycle

1. Creation produces a private mutable draft. Kind/channel are immutable immediately.
2. Publication sets `published_at`. All semantic and configuration fields become immutable.
3. Availability uses inclusive `available_from` and exclusive `available_until`.
4. Abort sets `aborted_at`, stops delivery immediately, and preserves collected data.
5. Hard delete removes the communication and cascades audience, state, display, and response data.

A normal confirmation deletes a communication with no collected user data. When data exists, the API requires the exact title.

## Targeting

One mode is required:

- `everyone`: every authenticated user in the app.
- `whitelist`: only normalized selected users.
- `blacklist`: every app user except normalized selected users.

The backoffice picker queries only the current app and filters name, username, or email. Server validation rejects cross-app user IDs.

## Interactions and validation

Notification templates are hardcoded and API-validated:

- Acknowledge: `OK`
- Confirm: `I accept`, `I reject`
- Hard confirm: `I accept`
- Agreement: `Agree`, `Disagree`
- Hard agreement: `Agree`
- Yes/No: `Yes`, `No`

Poll options have stable IDs. Single-choice requires at most one preset option or Other, never both. Multiple-choice may combine presets and Other. Required polls need a preset or Other; skippable polls expose Skip. Optional notes never satisfy the required-answer rule.

Open input supports short or long text. Limits are title 160, email subject 200, body 20,000, poll option 200, short input/Other 500, and textarea/notes 5,000.

Markdown uses the shared `rehype-sanitize` pipeline and does not enable raw HTML. External links open in a new tab with `noopener noreferrer`. Link/media URLs require HTTPS outside local development. Media is URL-addressed image or video; uploads are future work.

## Qualified display tracking

The shared `NotificationCenter` fetches once on mount and never polls or refetches on focus. It returns `null` for an empty queue and advances locally after successful actions.

A display event is sent only after the current communication remains at least 50% visible for ten continuous seconds while the document is visible. Leaving the viewport or hiding the document resets the timer. A visit UUID makes the API idempotent for ordinary rerenders.

## Extension points

The normalized event/state model supports later exports, per-user backoffice history, additional delivery channels, email templates, external pickup, and delivery reporting. Those consumers must retain app-scoped authorization and must not weaken publication immutability.
