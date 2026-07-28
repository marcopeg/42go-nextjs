/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE SCHEMA IF NOT EXISTS "42go_data"');

  await knex.schema.withSchema("auth").alterTable("users", (table) => {
    table.unique(["app_id", "id"], {
      indexName: "auth_users_app_id_id_unique",
    });
  });

  await knex.schema
    .withSchema("42go_data")
    .createTable("communications", (table) => {
      table.text("id").notNullable();
      table.text("app_id").notNullable();
      table.text("channel").notNullable();
      table.text("kind").notNullable();
      table.text("style").notNullable().defaultTo("info");
      table.integer("priority").nullable().defaultTo(5);
      table.text("audience_mode").notNullable().defaultTo("everyone");
      table.text("title");
      table.text("subject");
      table.text("body_markdown");
      table.text("link_url");
      table.text("media_url");
      table.text("media_type");
      table.text("reaction_template");
      table.jsonb("interaction_config").notNullable().defaultTo("{}");
      table.text("created_by");
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp("available_from", { useTz: true });
      table.timestamp("available_until", { useTz: true });
      table.timestamp("published_at", { useTz: true });
      table.timestamp("aborted_at", { useTz: true });

      table.primary(["app_id", "id"]);
      table
        .foreign("created_by")
        .references("id")
        .inTable("auth.users")
        .onDelete("SET NULL");
      table.index(["app_id", "created_at"], "communications_app_created_idx");
      table.index(
        ["app_id", "channel", "published_at", "aborted_at", "available_from", "available_until"],
        "communications_delivery_idx"
      );
      table.index(
        ["app_id", "priority", "published_at"],
        "communications_priority_idx"
      );
    });

  await knex.raw(`
    ALTER TABLE "42go_data".communications
      ADD CONSTRAINT communications_channel_check CHECK (channel IN ('in_app', 'email')),
      ADD CONSTRAINT communications_kind_check CHECK (kind IN ('notification', 'poll', 'input', 'email')),
      ADD CONSTRAINT communications_style_check CHECK (style IN ('info', 'warning', 'danger', 'success')),
      ADD CONSTRAINT communications_priority_check CHECK (
        (channel = 'email' AND priority IS NULL) OR
        (channel = 'in_app' AND priority IN (0, 5, 10))
      ),
      ADD CONSTRAINT communications_audience_mode_check CHECK (audience_mode IN ('everyone', 'whitelist', 'blacklist')),
      ADD CONSTRAINT communications_channel_kind_check CHECK (
        (channel = 'email' AND kind = 'email') OR
        (channel = 'in_app' AND kind IN ('notification', 'poll', 'input'))
      ),
      ADD CONSTRAINT communications_content_check CHECK (
        (kind = 'email' AND subject IS NOT NULL AND length(subject) BETWEEN 1 AND 200
          AND body_markdown IS NOT NULL AND length(body_markdown) BETWEEN 1 AND 20000) OR
        (kind <> 'email' AND (
          (title IS NOT NULL AND length(title) BETWEEN 1 AND 160) OR
          (body_markdown IS NOT NULL AND length(body_markdown) BETWEEN 1 AND 20000)
        ))
      ),
      ADD CONSTRAINT communications_schedule_check CHECK (
        available_until IS NULL OR available_from IS NULL OR available_until > available_from
      ),
      ADD CONSTRAINT communications_media_check CHECK (
        (media_url IS NULL AND media_type IS NULL) OR
        (media_url IS NOT NULL AND media_type IN ('image', 'video'))
      )
  `);

  await knex.schema
    .withSchema("42go_data")
    .createTable("communication_audience", (table) => {
      table.text("app_id").notNullable();
      table.text("communication_id").notNullable();
      table.text("user_id").notNullable();
      table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.primary(["app_id", "communication_id", "user_id"]);
      table
        .foreign(["app_id", "communication_id"])
        .references(["app_id", "id"])
        .inTable("42go_data.communications")
        .onDelete("CASCADE");
      table
        .foreign(["app_id", "user_id"])
        .references(["app_id", "id"])
        .inTable("auth.users")
        .onDelete("CASCADE");
      table.index(["app_id", "user_id", "communication_id"], "communication_audience_user_idx");
    });

  await knex.schema
    .withSchema("42go_data")
    .createTable("communication_user_state", (table) => {
      table.text("app_id").notNullable();
      table.text("communication_id").notNullable();
      table.text("user_id").notNullable();
      table.timestamp("first_displayed_at", { useTz: true });
      table.text("reaction");
      table.jsonb("response");
      table.boolean("skipped").notNullable().defaultTo(false);
      table.timestamp("responded_at", { useTz: true });
      table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.primary(["app_id", "communication_id", "user_id"]);
      table
        .foreign(["app_id", "communication_id"])
        .references(["app_id", "id"])
        .inTable("42go_data.communications")
        .onDelete("CASCADE");
      table
        .foreign(["app_id", "user_id"])
        .references(["app_id", "id"])
        .inTable("auth.users")
        .onDelete("CASCADE");
      table.index(["app_id", "user_id", "responded_at"], "communication_state_user_idx");
      table.index(["app_id", "communication_id", "responded_at"], "communication_state_message_idx");
    });

  await knex.schema
    .withSchema("42go_data")
    .createTable("communication_display_events", (table) => {
      table.bigIncrements("id").primary();
      table.text("app_id").notNullable();
      table.text("communication_id").notNullable();
      table.text("user_id").notNullable();
      table.text("visit_id").notNullable();
      table.timestamp("displayed_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table
        .foreign(["app_id", "communication_id"])
        .references(["app_id", "id"])
        .inTable("42go_data.communications")
        .onDelete("CASCADE");
      table
        .foreign(["app_id", "user_id"])
        .references(["app_id", "id"])
        .inTable("auth.users")
        .onDelete("CASCADE");
      table.unique(
        ["app_id", "communication_id", "user_id", "visit_id"],
        { indexName: "communication_display_visit_unique" }
      );
      table.index(["app_id", "user_id", "displayed_at"], "communication_display_user_idx");
      table.index(["app_id", "communication_id", "displayed_at"], "communication_display_message_idx");
    });

  const grants = [
    ["notifications:list", "List notifications", "View app notification management"],
    ["notifications:create", "Create notifications", "Create app notification drafts"],
    ["notifications:edit", "Edit notifications", "Edit app notification drafts"],
    ["notifications:publish", "Publish notifications", "Publish or abort app notifications"],
    ["notifications:delete", "Delete notifications", "Permanently delete app notifications"],
  ];
  await knex("auth.grants")
    .insert(
      grants.map(([id, title, description]) => ({
        id,
        title,
        description,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      }))
    )
    .onConflict("id")
    .ignore();

  const appRowsResult = await knex.raw(`
    SELECT DISTINCT app_id
    FROM (
      SELECT app_id FROM auth.roles_users WHERE role_id = 'backoffice'
      UNION
      SELECT app_id FROM auth.roles_grants WHERE role_id = 'backoffice'
    ) scoped_backoffice_apps
  `);
  const appRows = appRowsResult.rows;
  if (appRows.length > 0) {
    await knex("auth.roles_grants")
      .insert(
        appRows.flatMap(({ app_id }) =>
          grants.map(([grant_id]) => ({
            app_id,
            role_id: "backoffice",
            grant_id,
            created_at: knex.fn.now(),
          }))
        )
      )
      .onConflict(["app_id", "role_id", "grant_id"])
      .ignore();
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema("42go_data").dropTableIfExists("communication_display_events");
  await knex.schema.withSchema("42go_data").dropTableIfExists("communication_user_state");
  await knex.schema.withSchema("42go_data").dropTableIfExists("communication_audience");
  await knex.schema.withSchema("42go_data").dropTableIfExists("communications");
  await knex("auth.roles_grants").whereIn("grant_id", [
    "notifications:list",
    "notifications:create",
    "notifications:edit",
    "notifications:publish",
    "notifications:delete",
  ]).del();
  await knex("auth.grants").whereIn("id", [
    "notifications:list",
    "notifications:create",
    "notifications:edit",
    "notifications:publish",
    "notifications:delete",
  ]).del();
  await knex.schema.withSchema("auth").alterTable("users", (table) => {
    table.dropUnique(["app_id", "id"], "auth_users_app_id_id_unique");
  });
};
