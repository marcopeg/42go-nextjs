# Security

Agent Skills and plugins are trusted code. They may instruct an assistant to run bundled scripts, access the network, or change files with the user's permissions.

## Before installing

- Review the skill's `SKILL.md`, scripts, hooks, MCP configuration, and declared dependencies.
- Install only from a repository and publisher you trust.
- Prefer tagged releases or pinned commits when reproducibility matters.
- Keep approval prompts enabled for unfamiliar scripts and destructive operations.

## Secrets

Never commit tokens, connection codes, credential files, `.env` files, or captured request headers.

QuickList stores credentials in `~/.config/quicklist/credentials.json` by default. The file is created with user-only permissions. Its `qlc1_...` connection code is transport-encoded, not encrypted, and must be handled like the bearer token it contains.

QuickShare stores its origin and personal bearer token in `~/.config/quickshare/credentials.json` by default. The credential file and its directory are owner-readable only. Configure through the hidden interactive prompt; do not place a QuickShare token in command arguments, URLs, environment variables, logs, screenshots, or chat.

## Reporting a vulnerability

Do not open a public issue containing exploit details or credentials. Contact the repository owner privately through the security-reporting channel configured on the Git hosting repository. If no private channel is configured yet, use GitHub's private vulnerability reporting after the repository is created.

Include the affected plugin and version, impact, reproduction steps, and any suggested mitigation. Revoke or rotate any credential exposed during investigation.
