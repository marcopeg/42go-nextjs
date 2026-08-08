# LingoCafe Personas Data Model

## Purpose and authority

Personas are reusable LingoCafe content identities. They are prerequisites for
conversations but are not owned by conversations: later books, lessons, or
other content types may reference the same stable persona.

The `books` repository owns canonical persona YAML and editable avatar SVGs.
The external assets distribution owns published, content-addressed avatar
files. `42go-nextjs` owns the PostgreSQL runtime projection defined by
`knex/migrations/20260806220000_lingocafe_personas.js`.

## Runtime tables

### `lingocafe.personas`

One row is the complete runtime aggregate for one stable identity.

| Column | Meaning |
| --- | --- |
| `id` | Stable lowercase kebab-case persona ID. Content always references this value. |
| `status` | `development`, `accepted`, or `retired`. |
| `canonical_language` | Normalized canonical source language. |
| `working_label` | Short editorial/runtime label. |
| `one_line` | Concise public-safe persona summary. |
| `stable_profile` | JSONB containing durable life shape and communication traits. |
| `role_compatibility` | JSONB reuse constraints. It does not grant authority in a scenario. |
| `visual_fingerprint` | JSONB stable visual cues shared by presentations. |
| `presentations` | Runtime-ready JSONB presentation map described below. |
| `is_visible` | Explicit runtime publication decision. |
| `source_schema_version`, `source_path`, `source_hash` | Canonical source audit identity. |
| `metadata` | Remaining non-runtime source/audit information. |
| `created_at`, `updated_at` | Runtime audit timestamps. |

The database checks object shape for the aggregate JSONB fields, requires a
`default` presentation, and rejects a retired visible persona. The publisher
performs the deeper presentation and persona-contract validation before it
opens a database transaction.

### Presentation map

The `presentations` JSONB object is keyed by normalized language context, with
`default` required. A localized presentation is not another persona. It is the
name, ordinary context, and artwork used when presenting the same identity to
a learner with that own-language context.

Every presentation contains at least:

```json
{
  "id": "marco-conti",
  "language_context": "it",
  "display_name": "Marco Conti",
  "birthplace": "Bologna, Italy",
  "current_context": "Living with his family in a northern European city.",
  "avatar_asset_key": "personas/mark-carter/marco-conti/avatar-<sha256>.svg",
  "avatar_content_hash": "<64 lowercase hex characters>",
  "avatar_media_type": "image/svg+xml"
}
```

Optional presentation-specific context may be retained in the same object.
The publisher validates that:

- the map key and `language_context` agree;
- presentation IDs are globally unique;
- `avatar_asset_key` is a safe environment-neutral relative key;
- `avatar_content_hash` is the SHA-256 of the exact published bytes;
- `avatar_media_type` is `image/svg+xml` for the current corpus;
- no source filesystem path, absolute public host, SVG bytes, or executable
  markup is stored in PostgreSQL.

The application prepends its configured assets base URL when creating the
public avatar URL. Content-addressed keys keep the existing immutable asset
caching correct and allow the origin to move from NGINX to a CDN without a
database migration.

Presentation resolution requests the signed-in learner's normalized own
language and falls back to `default`. It never rewrites dialogue, scenario
facts, professional authority, or learner state.

### `lingocafe.persona_publication_state`

One `id = 'current'` row stores the digest of the complete published persona
projection and its successful publication time. The digest covers canonical
persona data and the content hashes of every referenced avatar.

## Ownership and publication

The persona publisher owns both persona tables. Conversation publication may
read them and reference `personas.id`; it must not mutate them.

Safe publication order is:

1. Validate the complete persona source and every presentation.
2. Produce content-addressed avatar files and an asset manifest.
3. Publish/verify immutable assets before exposing their keys in PostgreSQL.
4. Acquire a persona-publication advisory lock.
5. Upsert complete persona aggregates, preserving `created_at`.
6. Update `persona_publication_state` only after all rows validate and succeed.
7. Commit atomically.

Missing top-level personas are not implicitly deleted. Retire and hide a
persona first. A persona referenced by conversation cast is protected by a
restrictive foreign key. Old content-addressed assets must remain available for
rollback and cached clients.

The publisher may generate reviewable SQL or connect directly to PostgreSQL,
but both modes implement the same contract. It never writes conversation or
learner-owned tables.
