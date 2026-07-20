# QuickList personal API

Base path: `/api/quicklists/v1`. Send `Authorization: Bearer <token>` and JSON request bodies. The API never accepts session cookies as API credentials.

Only lists that their owner has API-enabled are visible. A collaborator can operate on an enabled shared list with their own token to the same extent as in the UI. Collaborators can rename or change mode and fully manage items, but only owners can delete lists. Sharing and the API-enabled flag are deliberately absent from this API.

## Routes

- `GET /api/quicklists/v1?limit=50&cursor=<opaque>` — visible enabled lists.
- `POST /api/quicklists/v1` — create an API-enabled list. Body: `{ "title": string, "mode"?: "todo" | "checklist", "items"?: string[] }`.
- `GET /api/quicklists/v1/{listId}` — list details and items.
- `PATCH /api/quicklists/v1/{listId}` — body may contain `title` or `mode`.
- `DELETE /api/quicklists/v1/{listId}` — owner only.
- `GET /api/quicklists/v1/{listId}/items` — ordered items.
- `POST /api/quicklists/v1/{listId}/items` — single `{ "title": string, "position"?: number }` or bulk `{ "titles": string[], "afterId"?: uuid }`.
- `PATCH /api/quicklists/v1/{listId}/items/{itemId}` — body may contain `title` or `completed`.
- `DELETE /api/quicklists/v1/{listId}/items/{itemId}`.
- `POST /api/quicklists/v1/{listId}/items/reorder` — `{ "itemIds": uuid[] }`, containing every item exactly once.
- `POST /api/quicklists/v1/{listId}/actions` — `{ "action": "drop-completed" | "reset-checklist" }`.

Success responses are JSON. Errors use `{ "error": string, "message": string, "timestamp": string }`. Expect `400` validation errors, `401` invalid/missing credentials, `403` owner-only denial, `404` inaccessible or disabled lists, and `409` conflicts.

The helper accepts `QUICKLIST_API_TOKEN` and `QUICKLIST_API_BASE_URL` as an explicit paired override. `QUICKLIST_CREDENTIALS_FILE` changes the credential file path. Do not print these values.

## Connection code

Profile settings copy a single setup secret in this format:

```text
qlc1_<unpadded-base64url-json>
```

The decoded UTF-8 JSON is `{ "v": 1, "baseUrl": "https://quicklist.example", "token": "..." }`. The configure command reads the code through hidden terminal input, validates it, and stores the decoded values. Base64URL is not encryption; handle the code exactly like the bearer token and never place it in logs, shell arguments, shell history, or tracked files.

For an envelope the user has deliberately pasted into chat from a device without terminal access, `configure --from-stdin` provides a documented fallback. Warn first, feed the value only to process stdin, and recommend token rotation plus normal hidden-prompt setup afterward. The chat and tool histories may retain the exposed secret.
