/** @param { import("knex").Knex } knex */
exports.up = async function up(knex) {
  await knex.schema.withSchema("quickshare").alterTable("resources", (table) => {
    table.boolean("ever_published").notNullable().defaultTo(false);
  });
  await knex("quickshare.resources").whereNotNull("published_at").update({ ever_published: true });
};

/** @param { import("knex").Knex } knex */
exports.down = async function down(knex) {
  await knex.schema.withSchema("quickshare").alterTable("resources", (table) => {
    table.dropColumn("ever_published");
  });
};
