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
        .withSchema("events")
        .from("events")
        .where({ app_id: "lingocafe" })
        .del();
      await trx
        .withSchema("lingocafe")
        .from("books_progress")
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

    const now = new Date();

    await trx("auth.users").where({ id: jane.id }).update({
      profile: {
        ownLang: "en",
        targetLang: "sv",
        targetLevel: "a2",
      },
      feature_flags: {
        translate: true,
      },
      consent: {
        terms: [
          {
            value: true,
            changedAt: now.toISOString(),
            version: "terms-2026-05-04",
            statement: "I accept the Terms and Conditions",
            source: "seed",
            method: "seed",
          },
        ],
        privacy: [
          {
            value: true,
            changedAt: now.toISOString(),
            version: "privacy-2026-05-04",
            statement: "I acknowledge the Privacy Policy",
            source: "seed",
            method: "seed",
          },
        ],
      },
      updated_at: now,
    });
  });
};
