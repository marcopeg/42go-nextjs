---
sessionId: "2604291620"
sessionSlug: "lingocafe-seed-data-cleanup"
goal: "LingoCafe seed data cleanup"
status: "active"
startedAt: "2026-04-29T16:20:09+02:00"
updatedAt: "2026-04-29T16:20:27+02:00"
memoryFile: "./memory.md"
---
# Vibe Session — LingoCafe seed data cleanup

## Goal

LingoCafe seed data cleanup

## Context Digest

> Populate after scanning the backlog, documentation, and codebase.

## Durable Documentation Targets

- Promote stable findings into the paired `memory.md` during the session.
- Promote broader repo knowledge into the relevant permanent docs under `docs/`.

## Log

<!-- Timestamped working notes are appended here. -->

### 2026-04-29 16:20 — LingoCafe seed cleanup completed

Updated knex/seeds/20260427151000_init_lingocafe_data.js so it no longer creates auth.users rows for app_id=lingocafe, no longer seeds books/pages/progress, and upserts the LingoCafe profile onto the default app john.doe@example.com user. Verified with npm run qa, make seed, and a direct database query showing the profile belongs to default john with own_lang=en, target_lang=sv, target_level=a2.

### 2026-04-29 16:20 — LingoCafe seed user association

Promoted stable context into `docs/vibe-sessions/2604291620.lingocafe-seed-data-cleanup/memory.md`. Recorded the durable seed rule that LingoCafe profiles attach to the default john.doe@example.com user and that the initial LingoCafe seed remains profile-only.
