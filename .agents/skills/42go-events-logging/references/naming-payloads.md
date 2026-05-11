# Naming And Payloads

Prefer dot namespace names:

- `user.signup`
- `user.login`
- `user.logout`
- `user.profile.created`
- `user.profile.updated`
- `user.consent.created`
- `user.consent.updated`
- `book.info`
- `page.open`
- `page.scroll`
- `page.translate`
- `read.settings.opened`
- `read.settings.changed`

Do not prefix app-owned events with the app ID. The event row already carries `app_id`.

Keep app-specific dimensions in `data`, not in core columns.

Examples:

```json
{ "book_id": "dracula-en-a2", "page_id": "001" }
```

For translations, log cache/source metadata without storing text:

```json
{
  "cache_type": "client",
  "from": "sv",
  "to": "en",
  "translation_hash": "..."
}
```

Do not store:

- passwords
- OAuth tokens
- cookies
- secrets
- full request headers
- excessive profile snapshots beyond the event's purpose
