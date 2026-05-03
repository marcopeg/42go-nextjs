/**
 * Seed LingoCafe demo data
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  await knex.transaction(async (trx) => {
    const staleLingocafeUsers = await trx("auth.users")
      .where({ app_id: "lingocafe" })
      .select("id");
    const staleLingocafeUserIds = staleLingocafeUsers.map((user) => user.id);

    if (staleLingocafeUserIds.length > 0) {
      await trx
        .withSchema("lingocafe")
        .from("events")
        .whereIn("user_id", staleLingocafeUserIds)
        .del();
      await trx
        .withSchema("lingocafe")
        .from("books_progress")
        .whereIn("user_id", staleLingocafeUserIds)
        .del();
      await trx
        .withSchema("lingocafe")
        .from("profiles")
        .whereIn("user_id", staleLingocafeUserIds)
        .del();
    }

    const jane = await trx("auth.users")
      .select("id")
      .where({ app_id: "lingocafe", email: "jane.doe@example.com" })
      .first();

    if (!jane) {
      throw new Error('Missing LingoCafe app user "jane.doe@example.com"');
    }

    await trx
      .withSchema("lingocafe")
      .into("profiles")
      .insert({
        user_id: jane.id,
        own_lang: "en",
        target_lang: "sv",
        target_level: "a2",
        data: {},
      })
      .onConflict("user_id")
      .merge({
        own_lang: "en",
        target_lang: "sv",
        target_level: "a2",
        data: {},
      });
  });
};
