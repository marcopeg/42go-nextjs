/**
 * Seed QuickShare development credentials for local and tunneled testing.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcrypt");

const hashPassword = (password) => bcrypt.hash(password, 10);

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

exports.seed = async function seedQuickShareTestUsers(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();
    const accounts = [
      {
        username: "admin",
        name: "QuickShare Admin",
        email: "admin@quickshare.app",
        password: "admin",
        image: "https://ui-avatars.com/api/?name=QuickShare+Admin",
      },
      {
        username: "john",
        name: "John Doe",
        email: "john.doe@quickshare.app",
        password: "john",
        image: "https://api.dicebear.com/8.x/adventurer/svg?seed=quickshare-john",
      },
    ];

    for (const account of accounts) {
      const id = await upsertUser(trx, {
        app_id: "quickshare",
        id: uuidv4(),
        ...account,
        password: await hashPassword(account.password),
        created_at: now,
        updated_at: now,
      });
      console.log(`Created QuickShare ${account.username} test user with ID: ${id}`);
    }
  });
};
