# Client Tracker

Client logging is enabled per app through AppConfig.

Use:

```ts
const { trackEvent } = useEventTracker();
trackEvent("page.scroll", { book_id: bookId, page_id: pageId });
```

The tracker batches events and flushes on an interval, `visibilitychange`, and `pagehide`.

If an app has not enabled event collection, the tracker warns in the console and skips the event.

Most apps should require a valid session for `/api/events`.
