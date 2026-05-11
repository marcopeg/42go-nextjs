# Server Writer

Use `recordEvent()` or `recordEvents()` from `@/42go/events/server`.

Server writers must provide or resolve:

- trusted `appId`
- trusted `userId`
- event `name`
- JSON object `data`
- JSON object `meta`

Do not trust client-provided `app_id`, `user_id`, or `created_at`.

Example:

```ts
await recordEvent({
  appId: "lingocafe",
  userId,
  name: "book.info",
  data: { book_id: bookId },
});
```

Use the `db` option when recording inside an existing transaction.
