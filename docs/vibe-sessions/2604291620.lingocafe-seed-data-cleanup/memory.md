---
sessionId: "2604291620"
sessionSlug: "lingocafe-seed-data-cleanup"
goal: "LingoCafe seed data cleanup"
status: "active"
createdAt: "2026-04-29T16:20:09+02:00"
updatedAt: "2026-04-29T16:20:27+02:00"
sourceSession: "./session.md"
---
# Session Memory — LingoCafe seed data cleanup

## Goal

LingoCafe seed data cleanup

## Stable Context

- The default auth seed creates `john.doe@example.com` under `app_id = "default"` with a generated id. LingoCafe seed data must identify that user by `app_id` plus email instead of hard-coding an id.
- `knex/seeds/20260427151000_init_lingocafe_data.js` is now profile-only for LingoCafe demo setup. It does not seed books, pages, or book progress.
- LingoCafe must not create duplicate `auth.users` records under `app_id = "lingocafe"` for John or Jane. The LingoCafe profile attaches to default `john` with `own_lang = "en"`, `target_lang = "sv"`, and `target_level = "a2"`.

## Decisions

- Keep LingoCafe book data separate from the initial LingoCafe profile seed.
- Use an upsert on `lingocafe.profiles.user_id` so rerunning seeds refreshes John’s profile without failing on an existing profile.

## Architecture Notes

- LingoCafe profile rows reference `auth.users.id` directly and are not scoped by `app_id`; the selected user identity is therefore controlled by the seed lookup.

## Working Agreements

- None yet.

## Open Questions

- None yet.
