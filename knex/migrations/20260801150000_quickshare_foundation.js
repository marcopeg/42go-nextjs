/**
 * QuickShare owns source data and release metadata. Static delivery is a later,
 * disposable projection of these rows.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw("CREATE SCHEMA IF NOT EXISTS quickshare");

  // auth.users historically has a global primary key. The composite key gives
  // product schemas a database-enforced app/user ownership reference too.
  await knex.raw(
    'ALTER TABLE auth.users ADD CONSTRAINT uq_auth_users_app_id_id UNIQUE (app_id, id)'
  ).catch((error) => {
    if (error.code !== "42P07" && error.code !== "42710") throw error;
  });

  await knex.schema.withSchema("quickshare").createTable("accounts", (table) => {
    table.uuid("id").primary().notNullable().defaultTo(knex.raw("uuid_generate_v4()"));
    table.text("app_id").notNullable();
    table.text("user_id").notNullable();
    table.text("handle").notNullable();
    table.text("normalized_handle").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.unique(["app_id", "user_id"], { indexName: "uq_quickshare_accounts_app_user" });
    table.unique(["app_id", "id"], { indexName: "uq_quickshare_accounts_app_id_id" });
    table.unique(["app_id", "normalized_handle"], { indexName: "uq_quickshare_accounts_handle" });
    table.foreign(["app_id", "user_id"]).references(["app_id", "id"]).inTable("auth.users").onDelete("CASCADE");
  });

  await knex.schema.withSchema("quickshare").createTable("resources", (table) => {
    table.uuid("id").primary().notNullable().defaultTo(knex.raw("uuid_generate_v4()"));
    table.text("app_id").notNullable();
    table.uuid("account_id").notNullable();
    table.text("type").notNullable();
    table.text("title").notNullable().defaultTo("Untitled share");
    table.text("lifecycle").notNullable().defaultTo("draft");
    table.integer("current_draft_revision").notNullable().defaultTo(1);
    table.integer("revision").notNullable().defaultTo(1);
    table.text("next_identifier_kind").notNullable().defaultTo("short");
    table.text("next_short_code").nullable();
    table.text("next_custom_id").nullable();
    table.text("published_identifier_kind").nullable();
    table.text("published_short_code").nullable();
    table.text("published_custom_id").nullable();
    table.uuid("published_release_id").nullable();
    table.timestamp("published_at").nullable();
    table.timestamp("unpublished_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.foreign(["app_id", "account_id"]).references(["app_id", "id"]).inTable("quickshare.accounts").onDelete("CASCADE");
    table.unique(["app_id", "account_id", "id"], { indexName: "uq_quickshare_resources_app_account_id" });
    table.index(["app_id", "account_id", "updated_at"], "idx_quickshare_resources_owner");
    table.check("type IN ('text', 'markdown', 'web-page', 'template')", [], "ck_quickshare_resource_type");
    table.check("lifecycle IN ('draft', 'published', 'unpublished')", [], "ck_quickshare_resource_lifecycle");
    table.check("next_identifier_kind IN ('short', 'custom')", [], "ck_quickshare_next_identifier_kind");
    table.check("published_identifier_kind IS NULL OR published_identifier_kind IN ('short', 'custom')", [], "ck_quickshare_published_identifier_kind");
    table.check("(next_identifier_kind = 'short' AND next_short_code IS NOT NULL AND next_custom_id IS NULL) OR (next_identifier_kind = 'custom' AND next_short_code IS NULL AND next_custom_id IS NOT NULL)", [], "ck_quickshare_next_identifier_value");
    table.check("(published_identifier_kind IS NULL AND published_short_code IS NULL AND published_custom_id IS NULL) OR (published_identifier_kind = 'short' AND published_short_code IS NOT NULL AND published_custom_id IS NULL) OR (published_identifier_kind = 'custom' AND published_short_code IS NULL AND published_custom_id IS NOT NULL)", [], "ck_quickshare_published_identifier_value");
  });

  // Route claims make a route unavailable as soon as it is selected, not only
  // after it is published. They also prevent a pending route in one resource
  // from colliding with another resource's live route.
  await knex.schema.withSchema("quickshare").createTable("resource_route_claims", (table) => {
    table.uuid("id").primary().notNullable().defaultTo(knex.raw("uuid_generate_v4()"));
    table.text("app_id").notNullable();
    table.uuid("account_id").notNullable();
    table.uuid("resource_id").notNullable();
    table.text("state").notNullable();
    table.text("kind").notNullable();
    table.text("short_code").nullable();
    table.text("custom_id").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.unique(["resource_id", "state"], { indexName: "uq_quickshare_route_claim_resource_state" });
    table.foreign(["app_id", "account_id", "resource_id"]).references(["app_id", "account_id", "id"]).inTable("quickshare.resources").onDelete("CASCADE");
    table.check("state IN ('candidate', 'published')", [], "ck_quickshare_route_claim_state");
    table.check("kind IN ('short', 'custom')", [], "ck_quickshare_route_claim_kind");
    table.check("(kind = 'short' AND short_code ~ '^[a-z0-9_-]{6,32}$' AND custom_id IS NULL) OR (kind = 'custom' AND short_code IS NULL AND custom_id ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9]){0,1}$')", [], "ck_quickshare_route_claim_shape");
    table.check("COALESCE(short_code, custom_id) NOT IN ('api', 'assets', 'releases', 'system', 'www', '_system')", [], "ck_quickshare_route_claim_reserved");
  });
  await knex.raw('CREATE UNIQUE INDEX uq_quickshare_route_claim_short ON quickshare.resource_route_claims (short_code) WHERE short_code IS NOT NULL');
  // `s.42go.dev` only projects the production quickshare tenant. The default
  // app is local-test-only and never reaches that origin; production handles
  // are unique within quickshare, so account/custom-id is one public route.
  await knex.raw('CREATE UNIQUE INDEX uq_quickshare_route_claim_custom ON quickshare.resource_route_claims (account_id, custom_id) WHERE custom_id IS NOT NULL');

  await knex.schema.withSchema("quickshare").createTable("draft_revisions", (table) => {
    table.uuid("resource_id").notNullable().references("id").inTable("quickshare.resources").onDelete("CASCADE");
    table.integer("revision").notNullable();
    table.jsonb("content").notNullable().defaultTo("{}" );
    table.text("template_id").nullable();
    table.text("template_version").nullable();
    table.jsonb("template_config").nullable();
    table.text("app_id").notNullable();
    table.text("created_by").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.primary(["resource_id", "revision"]);
    table.foreign(["app_id", "created_by"]).references(["app_id", "id"]).inTable("auth.users").onDelete("RESTRICT");
    table.check("(template_id IS NULL AND template_version IS NULL AND template_config IS NULL) OR (template_id IS NOT NULL AND template_version IS NOT NULL AND template_config IS NOT NULL)", [], "ck_quickshare_template_instance");
  });

  await knex.schema.withSchema("quickshare").createTable("release_versions", (table) => {
    table.uuid("id").primary().notNullable().defaultTo(knex.raw("uuid_generate_v4()"));
    table.uuid("resource_id").notNullable();
    table.integer("release_number").notNullable();
    table.integer("draft_revision").notNullable();
    table.text("app_id").notNullable();
    table.text("created_by").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.unique(["resource_id", "release_number"], { indexName: "uq_quickshare_release_number" });
    table.unique(["id", "resource_id"], { indexName: "uq_quickshare_release_id_resource_id" });
    table.foreign(["resource_id", "draft_revision"]).references(["resource_id", "revision"]).inTable("quickshare.draft_revisions").onDelete("RESTRICT");
    table.foreign(["app_id", "created_by"]).references(["app_id", "id"]).inTable("auth.users").onDelete("RESTRICT");
  });
  await knex.raw(`
    CREATE OR REPLACE FUNCTION quickshare.assert_published_release_owner()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.published_release_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM quickshare.release_versions release
        WHERE release.id = NEW.published_release_id AND release.resource_id = NEW.id
      ) THEN
        RAISE EXCEPTION 'QuickShare published release must belong to the resource';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER quickshare_resources_release_owner
    BEFORE INSERT OR UPDATE OF published_release_id ON quickshare.resources
    FOR EACH ROW EXECUTE FUNCTION quickshare.assert_published_release_owner();
    CREATE OR REPLACE FUNCTION quickshare.reject_release_mutation()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'QuickShare release versions are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER quickshare_release_versions_immutable
    BEFORE UPDATE ON quickshare.release_versions
    FOR EACH ROW EXECUTE FUNCTION quickshare.reject_release_mutation();
  `);

  await knex.schema.withSchema("quickshare").createTable("release_manifests", (table) => {
    table.uuid("release_id").primary().notNullable().references("id").inTable("quickshare.release_versions").onDelete("CASCADE");
    table.text("manifest_version").notNullable();
    table.jsonb("manifest").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.withSchema("quickshare").createTable("release_assets", (table) => {
    table.uuid("release_id").notNullable().references("id").inTable("quickshare.release_versions").onDelete("CASCADE");
    table.text("asset_path").notNullable();
    table.text("content_type").notNullable();
    table.text("content_hash").notNullable();
    table.bigInteger("byte_size").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.primary(["release_id", "asset_path"]);
    table.check("asset_path !~ '(^/|(^|/)\\.\\.(/|$))'", [], "ck_quickshare_asset_path_safe");
  });
};

exports.down = async function down(knex) {
  await knex.schema.withSchema("quickshare").dropTableIfExists("release_assets");
  await knex.schema.withSchema("quickshare").dropTableIfExists("release_manifests");
  await knex.raw("DROP TRIGGER IF EXISTS quickshare_release_versions_immutable ON quickshare.release_versions");
  await knex.raw("DROP FUNCTION IF EXISTS quickshare.reject_release_mutation()");
  await knex.raw("DROP TRIGGER IF EXISTS quickshare_resources_release_owner ON quickshare.resources");
  await knex.raw("DROP FUNCTION IF EXISTS quickshare.assert_published_release_owner()");
  await knex.schema.withSchema("quickshare").dropTableIfExists("release_versions");
  await knex.schema.withSchema("quickshare").dropTableIfExists("draft_revisions");
  await knex.raw("DROP INDEX IF EXISTS quickshare.uq_quickshare_route_claim_custom");
  await knex.raw("DROP INDEX IF EXISTS quickshare.uq_quickshare_route_claim_short");
  await knex.schema.withSchema("quickshare").dropTableIfExists("resource_route_claims");
  await knex.schema.withSchema("quickshare").dropTableIfExists("resources");
  await knex.schema.withSchema("quickshare").dropTableIfExists("accounts");
  await knex.raw("DROP SCHEMA IF EXISTS quickshare CASCADE");
  await knex.raw("ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS uq_auth_users_app_id_id");
};
