---
name: quicklist
description: Manage QuickList to-do lists and items through the personal bearer-token API. Use when the user asks to list, create, rename, or delete QuickList lists; add, edit, check, intelligently reorganize, reorder, or delete items; read or change durable sorting instructions; clear completed items; or configure QuickList API credentials for an agent.
---

# QuickList

Use the bundled client for every QuickList operation. It keeps bearer tokens out of prompts and logs, resolves exact list names safely, and emits JSON.

Resolve `<skill-dir>` to the directory containing this `SKILL.md`. Always invoke the client from `<skill-dir>/scripts/quicklist.py`; never assume the skill is installed in the current repository.

## First use

Run this in a user-controlled terminal:

```bash
python3 <skill-dir>/scripts/quicklist.py configure
```

Paste the QuickList connection code copied from profile settings into the command's hidden prompt. The code packages the API origin and bearer token; Base64URL is transport encoding, not encryption. Treat the entire code as a secret.

A project-installed skill stores the decoded credentials under the canonical project path. A global installation uses `_global`. The default credential file is `~/.config/quicklist/credentials.json` and is written with user-only permissions.

Never ask the user to paste a token or connection code into chat or pass it as a command-line argument. If credentials are missing, give the user the configure command and stop.

If the user voluntarily supplies a `qlc1_...` connection code in chat, support it as a less-secure mobile fallback:

1. Warn that the envelope contains the raw bearer token and now remains in conversation history and may enter tool history.
2. Configure with `python3 <skill-dir>/scripts/quicklist.py configure --from-stdin`, sending the envelope only to the process stdin. Never interpolate it into a shell command, environment variable, output, or file other than the credential store.
3. Complete the requested QuickList operation.
4. Recommend rotating the token afterward and rerunning the normal `configure` command in a user-controlled terminal.

Do not refuse the requested operation solely because the user chose this documented fallback after the warning.

## Workflow

1. Translate the request into one or more client commands.
2. Prefer a list UUID when the user supplies one. Otherwise pass the exact list name.
3. If exact case-insensitive name resolution finds zero or multiple lists, stop and ask the user to disambiguate. Do not guess or fuzzy-match.
4. Run read commands before destructive changes when the target is unclear.
5. Use `--yes` only after the user has clearly requested list deletion.
6. Report the result without exposing credentials.

### Intelligent list reordering

When the user asks you to organize, sort, prioritize, group, or otherwise reason about a complete list:

1. Run `reorder-context` for the exact list.
2. Read `list.sortingInstructions` and every returned item. The endpoint includes completed items but deliberately does not reveal completion status.
3. Reorder only from explicit sorting instructions:
   - If the user supplied sorting guidance in the current request, treat it as a durable preference for future runs.
   - If the current request supplies no sorting guidance and `list.sortingInstructions` is empty or whitespace-only, stop without applying an order and ask the user what ordering instructions should be saved.
   - Never invent sorting priorities from the item texts alone.
4. When the user supplied sorting guidance in the current request:
   - Compare it with the stored instructions.
   - Write one concise, reusable rule set that preserves compatible existing preferences and makes the current request authoritative where they conflict.
   - Run `set-sorting-instructions` with that complete replacement text.
   - Run `reorder-context` again. Saving instructions invalidates the earlier reorder ETag.
5. If the user supplied no new sorting guidance, leave the non-empty stored instructions unchanged.
6. Produce one new one-based position for every item ID from the latest context. Do not add, delete, rename, check, or uncheck anything.
   - Apply the explicit saved instructions first.
   - Unless those instructions say otherwise, place every item that cannot be confidently matched to an instruction after all matched items.
   - Preserve the current relative order among unmatched items unless the saved instructions define another fallback.
7. Run `apply-order` with the exact `etag` from the latest context response and repeat `--item ITEM_UUID:POSITION` for every item.
8. If the client reports stale context, run `reorder-context` again and reason over the fresh representation. Never blindly retry the old order.

Write durable instructions as sorting principles, not as a snapshot of the current item IDs or positions. For example, convert “sort Shopping, fruit first” into a reusable rule such as “Place fruit first, then follow the existing category order.” A request to sort without new guidance is not permission to rewrite the stored instructions.

### Mandatory reorder after adding or editing item text

Every skill-driven item addition or item-text edit must end with a complete instruction-driven reorder. This applies to `add`, a title-changing `update-item`, bulk item additions, and `create --item` when the new list contains initial items. Completion-only `check` operations do not trigger this workflow because completion status is not a sorting input.

For an existing list, before changing item membership or text:

1. Resolve the exact list and run `sorting-instructions`.
2. If the saved value is empty or whitespace-only:
   - If the current request includes ordering guidance, turn it into concise reusable sorting instructions and save it.
   - Otherwise stop before adding or editing anything and ask the user to provide the ordering instructions to save. Do not mutate first and leave the list unreordered.
3. Perform the requested add or item-text edit.
4. Run `reorder-context` after the mutation. Do not reuse context or an ETag captured before it.
5. Reorder the complete list by following the **Intelligent list reordering** rules above, including the default that unmatched items go at the end while retaining their relative order.
6. Apply the complete order with the latest ETag. The operation is not finished until `apply-order` succeeds.
7. On a stale-context conflict, fetch fresh context, reason again, and apply a newly calculated complete order.

For `create --item`, there is no saved setting to inspect yet. Require ordering guidance in the current request; if it is absent, ask before creating the list. After creation, save the reusable instructions, fetch reorder context, and apply the complete order.

Do not silently skip the final reorder because the new or edited item appears to be in a reasonable position. The saved instructions, not insertion position or guesswork, determine the final list.

Use `sorting-instructions` when the user asks to inspect the saved guidance without loading list items. Use `set-sorting-instructions` when the user explicitly asks to change or clear the guidance without reordering.

Use the low-level `reorder` command only when the user has already supplied a complete item-ID sequence and no LLM sorting context is needed.

Common commands:

```bash
python3 <skill-dir>/scripts/quicklist.py lists
python3 <skill-dir>/scripts/quicklist.py show "Shopping"
python3 <skill-dir>/scripts/quicklist.py add "Shopping" "Milk"
python3 <skill-dir>/scripts/quicklist.py check "Shopping" ITEM_UUID
python3 <skill-dir>/scripts/quicklist.py create "Trip" --item Passport --item Charger
python3 <skill-dir>/scripts/quicklist.py update-list "Trip" --title "Summer trip"
python3 <skill-dir>/scripts/quicklist.py drop-completed "Shopping"
python3 <skill-dir>/scripts/quicklist.py sorting-instructions "Shopping"
python3 <skill-dir>/scripts/quicklist.py set-sorting-instructions "Shopping" "Place fruit first, then group by category."
python3 <skill-dir>/scripts/quicklist.py reorder-context "Shopping"
python3 <skill-dir>/scripts/quicklist.py apply-order "Shopping" --etag '"ql-..."' --item ITEM_UUID:1 --item OTHER_UUID:2
```

Use `python3 <skill-dir>/scripts/quicklist.py --help` for all commands and flags. Read [references/api.md](references/api.md) when endpoint shapes, permissions, or direct HTTP access matter.
