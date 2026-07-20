---
name: quicklist
description: Manage QuickList to-do lists and items through the personal bearer-token API. Use when the user asks to list, create, rename, or delete QuickList lists; add, edit, check, reorder, or delete items; clear completed items; or configure QuickList API credentials for an agent.
---

# QuickList

Use the bundled client for every QuickList operation. It keeps bearer tokens out of prompts and logs, resolves exact list names safely, and emits JSON.

## First use

Run this in a user-controlled terminal:

```bash
python3 .agents/skills/quicklist/scripts/quicklist.py configure
```

Paste the QuickList connection code copied from profile settings into the command's hidden prompt. The code packages the API origin and bearer token; Base64URL is transport encoding, not encryption. Treat the entire code as a secret.

A project-installed skill stores the decoded credentials under the canonical project path. A global installation uses `_global`. The default credential file is `~/.config/quicklist/credentials.json` and is written with user-only permissions.

Never ask the user to paste a token or connection code into chat or pass it as a command-line argument. If credentials are missing, give the user the configure command and stop.

If the user voluntarily supplies a `qlc1_...` connection code in chat, support it as a less-secure mobile fallback:

1. Warn that the envelope contains the raw bearer token and now remains in conversation history and may enter tool history.
2. Configure with `python3 .agents/skills/quicklist/scripts/quicklist.py configure --from-stdin`, sending the envelope only to the process stdin. Never interpolate it into a shell command, environment variable, output, or file other than the credential store.
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

Common commands:

```bash
python3 .agents/skills/quicklist/scripts/quicklist.py lists
python3 .agents/skills/quicklist/scripts/quicklist.py show "Shopping"
python3 .agents/skills/quicklist/scripts/quicklist.py add "Shopping" "Milk"
python3 .agents/skills/quicklist/scripts/quicklist.py check "Shopping" ITEM_UUID
python3 .agents/skills/quicklist/scripts/quicklist.py create "Trip" --item Passport --item Charger
python3 .agents/skills/quicklist/scripts/quicklist.py update-list "Trip" --title "Summer trip"
python3 .agents/skills/quicklist/scripts/quicklist.py drop-completed "Shopping"
```

Use `python3 .agents/skills/quicklist/scripts/quicklist.py --help` for all commands and flags. Read [references/api.md](references/api.md) when endpoint shapes, permissions, or direct HTTP access matter.
