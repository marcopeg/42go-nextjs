/**
 * Seed LingoCafe app test users.
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcrypt");

const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

const upsertUser = async (trx, user) => {
  const rows = await trx("auth.users")
    .insert(user)
    .onConflict(["app_id", "email"])
    .merge({
      username: user.username,
      name: user.name,
      password: user.password,
      image: user.image,
      updated_at: user.updated_at,
    })
    .returning("id");

  return rows[0].id || rows[0];
};

exports.seed = async function seedLingocafeTestUsers(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();

    const johnDoeId = await upsertUser(trx, {
      app_id: "lingocafe",
      id: uuidv4(),
      username: "john",
      name: "John Doe",
      email: "john.doe@example.com",
      password: await hashPassword("john"),
      image: "https://api.dicebear.com/8.x/adventurer/svg?seed=john-doe",
      created_at: now,
      updated_at: now,
    });
    console.log(`Created LingoCafe John Doe test user with ID: ${johnDoeId}`);

    const janeDoeId = await upsertUser(trx, {
      app_id: "lingocafe",
      id: uuidv4(),
      username: "jane",
      name: "Jane Doe",
      email: "jane.doe@example.com",
      password: await hashPassword("jane"),
      image: "https://api.dicebear.com/8.x/adventurer/svg?seed=jane-doe",
      created_at: now,
      updated_at: now,
    });
    console.log(`Created LingoCafe Jane Doe test user with ID: ${janeDoeId}`);
  });
};
