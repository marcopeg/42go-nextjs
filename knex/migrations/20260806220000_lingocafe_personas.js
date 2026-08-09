/**
 * Generic reusable LingoCafe personas.
 *
 * Personas are published before any content system that casts them. A persona
 * stays one stable identity; its language-context presentation is resolved
 * from the aggregate `presentations` JSONB map at read time.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.withSchema("lingocafe").createTable("personas", (table) => {
    table.text("id").primary().notNullable();
    table.text("persona_type").notNullable();
    table.text("status").notNullable();
    table.text("canonical_language").notNullable();
    table.text("working_label").notNullable();
    table.text("one_line").notNullable();
    table.jsonb("stable_profile").notNullable();
    table.jsonb("role_compatibility").notNullable();
    table.jsonb("visual_fingerprint").notNullable();
    table.jsonb("presentations").notNullable();
    table.boolean("is_visible").notNullable().defaultTo(false);
    table.text("source_schema_version").notNullable();
    table.text("source_path").notNullable();
    table.text("source_hash").notNullable();
    table.jsonb("metadata").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE lingocafe.personas
    ADD CONSTRAINT personas_id_check
      CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    ADD CONSTRAINT personas_status_check
      CHECK (status IN ('development', 'accepted', 'retired')),
    ADD CONSTRAINT personas_type_check
      CHECK (persona_type IN ('archetype', 'role')),
    ADD CONSTRAINT personas_canonical_language_check
      CHECK (canonical_language ~ '^[a-z]{2,3}(-[a-z0-9]+)*$'),
    ADD CONSTRAINT personas_visibility_status_check
      CHECK (status <> 'retired' OR NOT is_visible),
    ADD CONSTRAINT personas_source_hash_check
      CHECK (source_hash ~ '^[a-f0-9]{64}$'),
    ADD CONSTRAINT personas_stable_profile_object_check
      CHECK (jsonb_typeof(stable_profile) = 'object'),
    ADD CONSTRAINT personas_role_compatibility_object_check
      CHECK (jsonb_typeof(role_compatibility) = 'object'),
    ADD CONSTRAINT personas_visual_fingerprint_object_check
      CHECK (jsonb_typeof(visual_fingerprint) = 'object'),
    ADD CONSTRAINT personas_presentations_object_check
      CHECK (jsonb_typeof(presentations) = 'object'),
    ADD CONSTRAINT personas_presentations_default_check
      CHECK (
        jsonb_typeof(presentations -> 'default') = 'object'
      ),
    ADD CONSTRAINT personas_metadata_object_check
      CHECK (jsonb_typeof(metadata) = 'object')
  `);

  await knex.schema
    .withSchema("lingocafe")
    .createTable("persona_publication_state", (table) => {
      table.text("id").primary().notNullable();
      table.text("source_digest").notNullable();
      table.timestamp("published_at").notNullable().defaultTo(knex.fn.now());
    });

  await knex.raw(`
    ALTER TABLE lingocafe.persona_publication_state
    ADD CONSTRAINT persona_publication_state_singleton_check
      CHECK (id = 'current'),
    ADD CONSTRAINT persona_publication_state_digest_check
      CHECK (source_digest ~ '^[a-f0-9]{64}$')
  `);

  await knex("lingocafe.persona_publication_state").insert({
    id: "current",
    source_digest:
      "0000000000000000000000000000000000000000000000000000000000000000",
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("persona_publication_state");
  await knex.schema.withSchema("lingocafe").dropTable("personas");
};
