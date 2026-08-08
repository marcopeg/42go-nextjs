const FIXTURE_TIMESTAMP = "2026-08-06T20:10:00.000Z";
const FIXTURE_AVATAR_HASH =
  "9a91a97de6067cdf20fa47d947fd9e042bc05b161be2569dfe9c59d01b56f339";

/**
 * Seed one reserved persona aggregate for local schema/API development.
 * The books repository and persona publisher own the real corpus.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  await knex("lingocafe.personas")
    .insert({
      id: "fixture-learner",
      status: "accepted",
      canonical_language: "en",
      working_label: "Fixture learner",
      one_line: "A reserved reusable learner used by the development fixture.",
      stable_profile: {
        life_stage: "adult",
        temperament: ["curious", "practical"],
      },
      role_compatibility: {
        compatible: ["customer", "learner"],
        incompatible_without_story_change: ["licensed professional"],
      },
      visual_fingerprint: {
        tone: "approachable adult",
        recurring_cues: ["simple green accent"],
      },
      presentations: {
        default: {
          id: "fixture-learner",
          language_context: "default",
          display_name: "Sam",
          birthplace: "Fixture City",
          current_context: "Participating in local development fixtures.",
          avatar_asset_key: `personas/fixture-learner/fixture-learner/avatar-${FIXTURE_AVATAR_HASH}.svg`,
          avatar_content_hash: FIXTURE_AVATAR_HASH,
          avatar_media_type: "image/svg+xml",
        },
      },
      is_visible: true,
      source_schema_version: "poc-v0",
      source_path: "fixture://personas/fixture-learner/persona.yaml",
      source_hash:
        "7a3cb46087d8bbdc3faf6c2710cb108be2fdf2fd1184da4acb4d845e558439ce",
      metadata: { fixture: true },
      created_at: FIXTURE_TIMESTAMP,
      updated_at: FIXTURE_TIMESTAMP,
    })
    .onConflict("id")
    .merge([
      "status",
      "canonical_language",
      "working_label",
      "one_line",
      "stable_profile",
      "role_compatibility",
      "visual_fingerprint",
      "presentations",
      "is_visible",
      "source_schema_version",
      "source_path",
      "source_hash",
      "metadata",
      "updated_at",
    ]);
};
