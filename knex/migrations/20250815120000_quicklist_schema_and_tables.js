/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  // Ensure uuid extension and schema
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw("CREATE SCHEMA IF NOT EXISTS quicklist");

  // projects
  await knex.schema.withSchema("quicklist").createTable("projects", (table) => {
    table.text("app_id").notNullable();
    table
      .uuid("id")
      .primary()
      .notNullable()
      .defaultTo(knex.raw("uuid_generate_v4()"));
    table.text("title").notNullable().defaultTo("new list");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table
      .text("updated_by")
      .nullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("SET NULL");
    table
      .text("created_by")
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("RESTRICT");
    table
      .text("owned_by")
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("RESTRICT");
    table.index(["owned_by"], "idx_projects_owned_by");
    table.index(["created_by"], "idx_projects_created_by");
    table.index(["app_id"], "idx_projects_app_id");
  });

  // tasks
  await knex.schema.withSchema("quicklist").createTable("tasks", (table) => {
    table
      .uuid("id")
      .primary()
      .notNullable()
      .defaultTo(knex.raw("uuid_generate_v4()"));
    table
      .uuid("project_id")
      .notNullable()
      .references("id")
      .inTable("quicklist.projects")
      .onDelete("CASCADE");
    table.text("title").notNullable();
    table.integer("position").notNullable().defaultTo(0);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table
      .text("created_by")
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("RESTRICT");
    table.timestamp("completed_at").nullable();
    table
      .text("completed_by")
      .nullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("SET NULL");

    table.index(["project_id"], "idx_tasks_project");
    table.index(["project_id", "position"], "idx_tasks_project_position");
    table.index(["project_id", "completed_at"], "idx_tasks_project_completed");
  });

  // invites
  await knex.schema.withSchema("quicklist").createTable("invites", (table) => {
    table
      .uuid("project_id")
      .notNullable()
      .references("id")
      .inTable("quicklist.projects")
      .onDelete("CASCADE");
    table.text("email").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table
      .text("created_by")
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("RESTRICT");
    table.timestamp("expires_at").nullable();

    table.primary(["project_id", "email"]);
    table.index(["email"], "idx_invites_email");
  });

  // collabs
  await knex.schema.withSchema("quicklist").createTable("collabs", (table) => {
    table
      .uuid("project_id")
      .notNullable()
      .references("id")
      .inTable("quicklist.projects")
      .onDelete("CASCADE");
    table
      .text("user_id")
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("CASCADE");
    table.text("role").notNullable().defaultTo("editor");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.primary(["project_id", "user_id"]);
    table.index(["user_id"], "idx_collabs_user");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema("quicklist").dropTableIfExists("collabs");
  await knex.schema.withSchema("quicklist").dropTableIfExists("invites");
  await knex.schema.withSchema("quicklist").dropTableIfExists("tasks");
  await knex.schema.withSchema("quicklist").dropTableIfExists("projects");
  await knex.raw("DROP SCHEMA IF EXISTS quicklist CASCADE");
};
