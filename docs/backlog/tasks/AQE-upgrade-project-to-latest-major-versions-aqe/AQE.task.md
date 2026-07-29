---
taskId: AQE
status: archived
createdAt: 2026-04-23T15:27:45+02:00
completedAt: 2026-02-16T14:06:28+01:00
compressedAt: 2026-07-29T12:00:00+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Upgrade project to latest major versions

## Historical Summary

Archived proposal to upgrade framework, React, TypeScript, Tailwind, and lint tooling together.

## Retrieval Anchors

- `AQE` — Upgrade project to latest major versions.
- `eslint.config.mjs` replaces `.eslintrc`.
- `npx @next/codemod@canary upgrade latest` and `next-lint-to-eslint-cli`.
- `npm run build`, `tsc --noEmit`, `docker-compose up`.

## Durable Outcome and Decisions

The plan required staged upgrades, migration to flat ESLint configuration, and build/lint/type checks before runtime smoke testing. It preserved a rollback-friendly branch strategy.

## Validation and Limitations

This is an archived upgrade plan, not a retained record of a particular final dependency lockfile.

## Task Relationships

### Supersedes

None identified.

### Superseded by

None identified.

### Related Tasks

None identified.

## Compression Provenance

Consolidated `AQE.task.md`. Its exact version is recoverable from `compressedFromCommit` (`27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`).
