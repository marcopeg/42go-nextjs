---
sessionId: "2604291620"
sessionSlug: "lingocafe-seed-data-cleanup"
goal: "LingoCafe seed data cleanup"
status: "active"
createdAt: "2026-04-29T16:20:09+02:00"
updatedAt: "2026-04-30T11:03:04+02:00"
sourceSession: "./session.md"
---
# Session Memory — LingoCafe seed data cleanup

## Goal

LingoCafe seed data cleanup

## Stable Context

- The default auth seed creates `john.doe@example.com` under `app_id = "default"` with a generated id. LingoCafe seed data must identify that user by `app_id` plus email instead of hard-coding an id.
- `knex/seeds/20260427151000_init_lingocafe_data.js` is now profile-only for LingoCafe demo setup. It does not seed books, pages, or book progress.
- LingoCafe must not create duplicate `auth.users` records under `app_id = "lingocafe"` for John or Jane. The LingoCafe profile attaches to default `john` with `own_lang = "en"`, `target_lang = "sv"`, and `target_level = "a2"`.
- `42go.ngrok.app` is currently matched by the `default` app config, not `quicklist`; the default app does not inject `/themes/default.css`.
- Next dev blocks cross-origin `_next` asset and HMR requests unless the ngrok host is listed in `next.config.ts` `allowedDevOrigins`.

## Decisions

- Keep LingoCafe book data separate from the initial LingoCafe profile seed.
- Use an upsert on `lingocafe.profiles.user_id` so rerunning seeds refreshes John’s profile without failing on an existing profile.
- Keep `public/themes/quicklist.css` available for QuickList app hosts so a QuickList match does not request a missing stylesheet and trigger a strict MIME failure.

## Architecture Notes

- LingoCafe profile rows reference `auth.users.id` directly and are not scoped by `app_id`; the selected user identity is therefore controlled by the seed lookup.
- Ngrok browser failures can be caused by Next dev origin protection, not only by the ngrok tunnel itself. A `_next` JavaScript asset request with cross-site fetch headers returned `403` before `allowedDevOrigins: ["42go.ngrok.app"]` and returned JavaScript with `200` after the config change.

## Working Agreements

- None yet.

## Open Questions

- None yet.
