/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_categories", (table) => {
      table.text("id").primary().notNullable();
      table.text("status").notNullable();
      table.text("title").notNullable();
      table.text("description").notNullable();
      table.text("goal").notNullable();
      table.text("language_scope").notNullable();
      table.specificType("languages", "text[]").notNullable().defaultTo("{}");
      table.specificType("tags", "text[]").notNullable().defaultTo("{}");
      table.boolean("is_visible").notNullable().defaultTo(false);
      table.text("source_schema_version").notNullable();
      table.text("source_path").notNullable();
      table.text("source_hash").notNullable();
      table.jsonb("metadata").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_category_parents", (table) => {
      table.text("category_id").notNullable();
      table.text("parent_category_id").notNullable();

      table.primary(["category_id", "parent_category_id"]);
      table
        .foreign("category_id")
        .references("id")
        .inTable("lingocafe.conversation_categories")
        .onDelete("CASCADE");
      table
        .foreign("parent_category_id")
        .references("id")
        .inTable("lingocafe.conversation_categories")
        .onDelete("CASCADE");
      table.index(
        ["parent_category_id", "category_id"],
        "idx_lc_conv_cat_parents_parent"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_scenarios", (table) => {
      table.text("id").primary().notNullable();
      table.text("status").notNullable();
      table.text("canonical_language").notNullable();
      table.text("title").notNullable();
      table.text("description").notNullable();
      table.text("learner_promise").notNullable();
      table.text("language_scope").notNullable();
      table.specificType("languages", "text[]").notNullable().defaultTo("{}");
      table.specificType("tags", "text[]").notNullable().defaultTo("{}");
      table.boolean("is_visible").notNullable().defaultTo(false);
      table.text("source_schema_version").notNullable();
      table.text("source_path").notNullable();
      table.text("source_hash").notNullable();
      table.jsonb("metadata").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_scenario_localizations", (table) => {
      table.text("scenario_id").notNullable();
      table.text("language").notNullable();
      table.text("cefr_level").notNullable();
      table.text("title").notNullable();
      table.text("description").notNullable();

      table.primary(["scenario_id", "language", "cefr_level"]);
      table
        .foreign("scenario_id")
        .references("id")
        .inTable("lingocafe.conversation_scenarios")
        .onDelete("CASCADE");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_category_scenarios", (table) => {
      table.text("category_id").notNullable();
      table.text("scenario_id").notNullable();
      table
        .jsonb("match_provenance")
        .notNullable()
        .defaultTo(knex.raw(`'{}'::jsonb`));

      table.primary(["category_id", "scenario_id"]);
      table
        .foreign("category_id")
        .references("id")
        .inTable("lingocafe.conversation_categories")
        .onDelete("CASCADE");
      table
        .foreign("scenario_id")
        .references("id")
        .inTable("lingocafe.conversation_scenarios")
        .onDelete("CASCADE");
      table.index(
        ["scenario_id", "category_id"],
        "idx_lc_conv_cat_scenarios_scenario"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_category_availability", (table) => {
      table.text("category_id").notNullable();
      table.text("language").notNullable();
      table.text("level_key").notNullable();
      table.integer("conversation_count").notNullable();
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["category_id", "language", "level_key"]);
      table
        .foreign("category_id")
        .references("id")
        .inTable("lingocafe.conversation_categories")
        .onDelete("CASCADE");
      table.index(
        ["language", "level_key", "category_id"],
        "idx_lc_conv_cat_availability_selection"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_scenario_actors", (table) => {
      table.text("scenario_id").notNullable();
      table.text("id").notNullable();
      table.integer("position").notNullable();
      table.text("name").notNullable();
      table.text("role").notNullable();
      table.text("description").notNullable();
      table.jsonb("metadata").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));

      table.primary(["scenario_id", "id"]);
      table.unique(["scenario_id", "position"]);
      table
        .foreign("scenario_id")
        .references("id")
        .inTable("lingocafe.conversation_scenarios")
        .onDelete("CASCADE");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_variants", (table) => {
      table.text("scenario_id").notNullable();
      table.text("id").notNullable();
      table.text("status").notNullable();
      table.text("canonical_language").notNullable();
      table.text("title").notNullable();
      table.text("description").notNullable();
      table.text("language_scope").notNullable();
      table.specificType("languages", "text[]").notNullable().defaultTo("{}");
      table.specificType("tags", "text[]").notNullable().defaultTo("{}");
      table.boolean("is_visible").notNullable().defaultTo(false);
      table.text("source_schema_version").notNullable();
      table.text("source_path").notNullable();
      table.text("source_hash").notNullable();
      table.jsonb("metadata").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["scenario_id", "id"]);
      table
        .foreign("scenario_id")
        .references("id")
        .inTable("lingocafe.conversation_scenarios")
        .onDelete("CASCADE");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_variant_localizations", (table) => {
      table.text("scenario_id").notNullable();
      table.text("variant_id").notNullable();
      table.text("language").notNullable();
      table.text("cefr_level").notNullable();
      table.text("title").notNullable();
      table.text("description").notNullable();

      table.primary(["scenario_id", "variant_id", "language", "cefr_level"]);
      table
        .foreign(["scenario_id", "variant_id"])
        .references(["scenario_id", "id"])
        .inTable("lingocafe.conversation_variants")
        .onDelete("CASCADE");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_variant_cast", (table) => {
      table.text("scenario_id").notNullable();
      table.text("variant_id").notNullable();
      table.text("actor_id").notNullable();
      table.text("persona_id").nullable();

      table.primary(["scenario_id", "variant_id", "actor_id"]);
      table
        .foreign(["scenario_id", "variant_id"])
        .references(["scenario_id", "id"])
        .inTable("lingocafe.conversation_variants")
        .onDelete("CASCADE");
      table
        .foreign(["scenario_id", "actor_id"])
        .references(["scenario_id", "id"])
        .inTable("lingocafe.conversation_scenario_actors")
        .onDelete("RESTRICT");
      table
        .foreign("persona_id")
        .references("id")
        .inTable("lingocafe.personas")
        .onDelete("RESTRICT");
      table.index(
        ["persona_id"],
        "idx_lc_conversation_variant_cast_persona"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversations", (table) => {
      table.text("id").primary().notNullable();
      table.text("scenario_id").notNullable();
      table.text("variant_id").notNullable();
      table.text("status").notNullable();
      table.text("language").notNullable();
      table.text("cefr_level").notNullable();
      table.text("title").notNullable();
      table.text("description").notNullable();
      table.specificType("tags", "text[]").notNullable().defaultTo("{}");
      table.boolean("is_visible").notNullable().defaultTo(false);
      table.text("source_schema_version").notNullable();
      table.text("source_path").notNullable();
      table.text("source_hash").notNullable();
      table.jsonb("metadata").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.unique(["id", "scenario_id"], {
        indexName: "uq_lc_conversations_id_scenario",
      });
      table.unique(
        ["scenario_id", "variant_id", "language", "cefr_level"],
        { indexName: "uq_lc_conversations_realization" }
      );
      table
        .foreign(["scenario_id", "variant_id"])
        .references(["scenario_id", "id"])
        .inTable("lingocafe.conversation_variants")
        .onDelete("CASCADE");
      table.index(
        ["language", "cefr_level", "is_visible"],
        "idx_lc_conversations_discovery"
      );
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_rounds", (table) => {
      table.text("conversation_id").notNullable();
      table.text("scenario_id").notNullable();
      table.integer("position").notNullable();
      table.text("actor_id").notNullable();
      table.text("text").notNullable();

      table.primary(["conversation_id", "position"]);
      table
        .foreign(["conversation_id", "scenario_id"])
        .references(["id", "scenario_id"])
        .inTable("lingocafe.conversations")
        .onDelete("CASCADE");
      table
        .foreign(["scenario_id", "actor_id"])
        .references(["scenario_id", "id"])
        .inTable("lingocafe.conversation_scenario_actors")
        .onDelete("RESTRICT");
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_reads", (table) => {
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table
        .text("conversation_id")
        .notNullable()
        .references("id")
        .inTable("lingocafe.conversations")
        .onDelete("CASCADE");
      table.timestamp("read_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["user_id", "conversation_id"]);
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_progress", (table) => {
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table
        .text("conversation_id")
        .notNullable()
        .references("id")
        .inTable("lingocafe.conversations")
        .onDelete("CASCADE");
      table.integer("progress_bps").notNullable().defaultTo(0);
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["user_id", "conversation_id"]);
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_stars", (table) => {
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table
        .text("conversation_id")
        .notNullable()
        .references("id")
        .inTable("lingocafe.conversations")
        .onDelete("CASCADE");
      table.timestamp("starred_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["user_id", "conversation_id"]);
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_publication_state", (table) => {
      table.text("id").primary().notNullable();
      table.text("source_digest").notNullable();
      table.timestamp("published_at").notNullable().defaultTo(knex.fn.now());
    });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_user_state_versions", (table) => {
      table.text("user_id").primary().notNullable();
      table.bigInteger("version").notNullable().defaultTo(0);
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table
        .foreign("user_id")
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
    });

  await knex("lingocafe.conversation_publication_state").insert({
    id: "current",
    source_digest:
      "0000000000000000000000000000000000000000000000000000000000000000",
  });

  await knex.raw(`
    CREATE INDEX idx_lc_conversation_reads_user_time
    ON lingocafe.conversation_reads (user_id, read_at DESC)
  `);

  await knex.raw(`
    CREATE INDEX idx_lc_conversation_progress_user_time
    ON lingocafe.conversation_progress (user_id, updated_at DESC)
  `);

  await knex.raw(`
    CREATE INDEX idx_lc_conversation_stars_user_time
    ON lingocafe.conversation_stars (user_id, starred_at DESC)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_categories
    ADD CONSTRAINT conversation_categories_status_check
    CHECK (status IN ('draft', 'accepted', 'deprecated')),
    ADD CONSTRAINT conversation_categories_language_scope_check
    CHECK (
      (language_scope = 'all' AND cardinality(languages) = 0)
      OR
      (language_scope = 'specific' AND cardinality(languages) > 0)
    ),
    ADD CONSTRAINT conversation_categories_visibility_status_check
    CHECK (status <> 'deprecated' OR NOT is_visible)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_category_parents
    ADD CONSTRAINT conversation_category_parents_no_self_check
    CHECK (category_id <> parent_category_id)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_category_availability
    ADD CONSTRAINT conversation_category_availability_language_check
      CHECK (language ~ '^[a-z]{2,3}(-[a-z0-9]+)*$'),
    ADD CONSTRAINT conversation_category_availability_level_key_check
      CHECK (level_key IN (
        'a1', 'a2', 'b1', 'b2',
        'beginner', 'intermediate', 'advanced'
      )),
    ADD CONSTRAINT conversation_category_availability_count_check
      CHECK (conversation_count >= 0)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_scenarios
    ADD CONSTRAINT conversation_scenarios_status_check
    CHECK (status IN ('development', 'release-candidate', 'review', 'accepted', 'retired')),
    ADD CONSTRAINT conversation_scenarios_language_scope_check
    CHECK (
      (language_scope = 'all' AND cardinality(languages) = 0)
      OR
      (language_scope = 'specific' AND cardinality(languages) > 0)
    ),
    ADD CONSTRAINT conversation_scenarios_visibility_status_check
    CHECK (status <> 'retired' OR NOT is_visible)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_scenario_localizations
    ADD CONSTRAINT conversation_scenario_localizations_cefr_check
    CHECK (cefr_level IN ('a1', 'a2', 'b1', 'b2')),
    ADD CONSTRAINT conversation_scenario_localizations_language_check
    CHECK (language ~ '^[a-z]{2,3}(-[a-z0-9]+)*$')
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_scenario_actors
    ADD CONSTRAINT conversation_scenario_actors_position_check
    CHECK (position >= 1)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_variants
    ADD CONSTRAINT conversation_variants_status_check
    CHECK (status IN ('developed', 'release-candidate', 'review', 'accepted', 'retired')),
    ADD CONSTRAINT conversation_variants_language_scope_check
    CHECK (
      (language_scope = 'all' AND cardinality(languages) = 0)
      OR
      (language_scope = 'specific' AND cardinality(languages) > 0)
    ),
    ADD CONSTRAINT conversation_variants_visibility_status_check
    CHECK (status <> 'retired' OR NOT is_visible)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_variant_localizations
    ADD CONSTRAINT conversation_variant_localizations_cefr_check
    CHECK (cefr_level IN ('a1', 'a2', 'b1', 'b2')),
    ADD CONSTRAINT conversation_variant_localizations_language_check
    CHECK (language ~ '^[a-z]{2,3}(-[a-z0-9]+)*$')
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversations
    ADD CONSTRAINT conversations_status_check
    CHECK (status IN ('development', 'release-candidate', 'review', 'accepted', 'retired')),
    ADD CONSTRAINT conversations_cefr_check
    CHECK (cefr_level IN ('a1', 'a2', 'b1', 'b2')),
    ADD CONSTRAINT conversations_language_check
    CHECK (language ~ '^[a-z]{2,3}(-[a-z0-9]+)*$'),
    ADD CONSTRAINT conversations_visibility_status_check
    CHECK (status <> 'retired' OR NOT is_visible)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_rounds
    ADD CONSTRAINT conversation_rounds_position_check
    CHECK (position >= 1),
    ADD CONSTRAINT conversation_rounds_text_check
      CHECK (btrim(text) <> '')
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_progress
    ADD CONSTRAINT conversation_progress_bps_range
      CHECK (progress_bps >= 0 AND progress_bps <= 10000)
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_publication_state
    ADD CONSTRAINT conversation_publication_state_singleton_check
      CHECK (id = 'current'),
    ADD CONSTRAINT conversation_publication_state_digest_check
      CHECK (source_digest ~ '^[a-f0-9]{64}$')
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_user_state_versions");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_publication_state");
  await knex.schema.withSchema("lingocafe").dropTable("conversation_stars");
  await knex.schema.withSchema("lingocafe").dropTable("conversation_progress");
  await knex.schema.withSchema("lingocafe").dropTable("conversation_reads");
  await knex.schema.withSchema("lingocafe").dropTable("conversation_rounds");
  await knex.schema.withSchema("lingocafe").dropTable("conversations");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_variant_cast");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_variant_localizations");
  await knex.schema.withSchema("lingocafe").dropTable("conversation_variants");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_scenario_actors");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_category_scenarios");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_category_availability");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_scenario_localizations");
  await knex.schema.withSchema("lingocafe").dropTable("conversation_scenarios");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_category_parents");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_categories");
};
