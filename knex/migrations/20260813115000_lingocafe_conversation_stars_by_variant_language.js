const createVariantLanguageStars = async (knex) => {
  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_stars", (table) => {
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table.text("scenario_id").notNullable();
      table.text("variant_id").notNullable();
      table.text("language").notNullable();
      table.timestamp("starred_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["user_id", "scenario_id", "variant_id", "language"]);
      table
        .foreign(["scenario_id", "variant_id"])
        .references(["scenario_id", "id"])
        .inTable("lingocafe.conversation_variants")
        .onDelete("CASCADE");
    });

  await knex.raw(`
    CREATE INDEX idx_lc_conversation_stars_user_time
    ON lingocafe.conversation_stars (user_id, starred_at DESC)
  `);
};

const createExactConversationStars = async (knex) => {
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

  await knex.raw(`
    CREATE INDEX idx_lc_conversation_stars_user_time
    ON lingocafe.conversation_stars (user_id, starred_at DESC)
  `);
};

const renameStarIndexesForReplacement = async (knex, suffix) => {
  await knex.raw(`
    ALTER INDEX lingocafe.conversation_stars_pkey
    RENAME TO conversation_stars_${suffix}_pkey
  `);
  await knex.raw(`
    ALTER INDEX lingocafe.idx_lc_conversation_stars_user_time
    RENAME TO idx_lc_conversation_stars_${suffix}_user_time
  `);
};

exports.up = async (knex) => {
  await knex.schema
    .withSchema("lingocafe")
    .renameTable("conversation_stars", "conversation_stars_legacy_exact");
  await renameStarIndexesForReplacement(knex, "legacy_exact");
  await createVariantLanguageStars(knex);

  await knex.raw(`
    INSERT INTO lingocafe.conversation_stars
      (user_id, scenario_id, variant_id, language, starred_at)
    SELECT
      legacy.user_id,
      conversation.scenario_id,
      conversation.variant_id,
      conversation.language,
      MIN(legacy.starred_at) AS starred_at
    FROM lingocafe.conversation_stars_legacy_exact AS legacy
    JOIN lingocafe.conversations AS conversation
      ON conversation.id = legacy.conversation_id
    GROUP BY
      legacy.user_id,
      conversation.scenario_id,
      conversation.variant_id,
      conversation.language
  `);

  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_stars_legacy_exact");
};

exports.down = async (knex) => {
  await knex.schema
    .withSchema("lingocafe")
    .renameTable("conversation_stars", "conversation_stars_legacy_variant");
  await renameStarIndexesForReplacement(knex, "legacy_variant");
  await createExactConversationStars(knex);

  await knex.raw(`
    INSERT INTO lingocafe.conversation_stars
      (user_id, conversation_id, starred_at)
    SELECT DISTINCT ON (legacy.user_id, legacy.scenario_id, legacy.variant_id, legacy.language)
      legacy.user_id,
      conversation.id,
      legacy.starred_at
    FROM lingocafe.conversation_stars_legacy_variant AS legacy
    JOIN lingocafe.conversations AS conversation
      ON conversation.scenario_id = legacy.scenario_id
      AND conversation.variant_id = legacy.variant_id
      AND conversation.language = legacy.language
    ORDER BY
      legacy.user_id,
      legacy.scenario_id,
      legacy.variant_id,
      legacy.language,
      CASE conversation.cefr_level
        WHEN 'a1' THEN 1
        WHEN 'a2' THEN 2
        WHEN 'b1' THEN 3
        WHEN 'b2' THEN 4
        ELSE 5
      END,
      conversation.id
  `);

  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_stars_legacy_variant");
};
