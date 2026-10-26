const publication = {
  "publishedAt": "2026-10-26T17:45:00.000Z"
};

exports.seed = async function seed(knex) {
  await knex.transaction(async (trx) => {
    await trx
      .withSchema("lingocafe")
      .table("books")
      .whereNull("published_at")
      .update({
        published_at: publication.publishedAt,
        updated_at: knex.fn.now(),
      });
  });
};
