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
- `GET /api/quicklists/v1/{listId}/sorting-instructions` — returns `{ "sortingInstructions": string }`.
- `POST /api/quicklists/v1/{listId}/sorting-instructions` — strict body `{ "sortingInstructions": string }`; trims and replaces the durable guidance, and an empty string clears it.
- `GET /api/quicklists/v1/{listId}/reorder` — LLM sorting context with list ID/name, `sortingInstructions`, and every item as `{ "id", "text", "position" }`. Completed items are included, but completion status and unrelated fields are omitted. Preserve the strong `ETag` response header.
- `POST /api/quicklists/v1/{listId}/reorder` — strict body `{ "items": [{ "id": uuid, "position": integer }] }`, containing every current item exactly once with unique gapless positions `1..N`. Send the preceding GET value as `If-Match`. The response returns canonical `{ "id", "position" }` entries and a replacement `ETag`.
- `POST /api/quicklists/v1/{listId}/actions` — `{ "action": "drop-completed" | "reset-checklist" }`.

Success responses are JSON. Errors use `{ "error": string, "message": string, "timestamp": string }`. Expect `400` validation errors, `401` invalid/missing credentials, `403` owner-only denial, `404` inaccessible or disabled lists, and `409` conflicts.

Reorder POST returns `428 Precondition Required` when `If-Match` is missing or malformed. It returns `409 Conflict` without mutation when the list name, sorting instructions, item IDs, item text, or item positions changed after GET. Fetch fresh context and reason again; do not retry the stale payload. Completion-only changes do not invalidate this reorder ETag.

Sorting instructions are trimmed plain text capped at 4,000 Unicode characters. List names and item text are capped at 250 Unicode characters on all create/update paths.

Reading or writing sorting instructions uses the same bearer-token, API-enabled-list, and owner/collaborator access rules as other list settings. Because an instruction update changes reorder context, fetch `/reorder` after the instruction POST before calculating or submitting positions.

The helper accepts `QUICKLIST_API_TOKEN` and `QUICKLIST_API_BASE_URL` as an explicit paired override. `QUICKLIST_CREDENTIALS_FILE` changes the credential file path. Do not print these values.

## Connection code

Profile settings copy a single setup secret in this format:

```text
qlc1_<unpadded-base64url-json>
```

The decoded UTF-8 JSON is `{ "v": 1, "baseUrl": "https://quicklist.example", "token": "..." }`. The configure command reads the code through hidden terminal input, validates it, and stores the decoded values. Base64URL is not encryption; handle the code exactly like the bearer token and never place it in logs, shell arguments, shell history, or tracked files.

For an envelope the user has deliberately pasted into chat from a device without terminal access, `configure --from-stdin` provides a documented fallback. Warn first, feed the value only to process stdin, and recommend token rotation plus normal hidden-prompt setup afterward. The chat and tool histories may retain the exposed secret.
