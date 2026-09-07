// Correct only the Swedish A2 display title; stable IDs and page rows are untouched.
exports.seed = async (knex) => {
  await knex.transaction(async (trx) => {
    await trx.withSchema('lingocafe').table('books')
      .where({ id: '20-thousand-leagues-under-the-sea-sv-a2', project: 'nemo', lang: 'sv', level: 'a2' })
      .where('title', 'En världs omsegling under havet')
      .update({ title: 'En världsomsegling under havet', updated_at: knex.fn.now() });
  });
};
