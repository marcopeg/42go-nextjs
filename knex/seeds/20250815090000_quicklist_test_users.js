/**
 * Seed Quicklist app test users.
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

const johnDoe = {
  username: "john",
  name: "John Doe",
  email: "john.doe@example.com",
  password: "john",
  image: "https://api.dicebear.com/8.x/adventurer/svg?seed=john-doe",
};

const janeDoe = {
  username: "jane",
  name: "Jane Doe",
  email: "jane.doe@example.com",
  password: "jane",
  image: "https://api.dicebear.com/8.x/adventurer/svg?seed=jane-doe",
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

const upsertRole = async (trx, role) => {
  await trx("auth.roles")
    .insert(role)
    .onConflict("id")
    .merge({
      title: role.title,
      description: role.description,
      updated_at: role.updated_at,
    });
};

const upsertGrant = async (trx, grant) => {
  await trx("auth.grants")
    .insert(grant)
    .onConflict("id")
    .merge({
      title: grant.title,
      description: grant.description,
      updated_at: grant.updated_at,
    });
};

exports.seed = async function seedQuicklistTestUsers(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();

    const johnDoeId = await upsertUser(trx, {
      app_id: "quicklist",
      id: uuidv4(),
      username: johnDoe.username,
      name: johnDoe.name,
      email: johnDoe.email,
      password: await hashPassword(johnDoe.password),
      image: johnDoe.image,
      created_at: now,
      updated_at: now,
    });
    console.log(`Created Quicklist John Doe test user with ID: ${johnDoeId}`);

    const janeDoeId = await upsertUser(trx, {
      app_id: "quicklist",
      id: uuidv4(),
      username: janeDoe.username,
      name: janeDoe.name,
      email: janeDoe.email,
      password: await hashPassword(janeDoe.password),
      image: janeDoe.image,
      created_at: now,
      updated_at: now,
    });
    console.log(`Created Quicklist Jane Doe test user with ID: ${janeDoeId}`);

    const lingocafeJohnDoeId = await upsertUser(trx, {
      app_id: "lingocafe",
      id: uuidv4(),
      username: johnDoe.username,
      name: johnDoe.name,
      email: johnDoe.email,
      password: await hashPassword(johnDoe.password),
      image: johnDoe.image,
      created_at: now,
      updated_at: now,
    });
    console.log(
      `Created LingoCafe John Doe test user with ID: ${lingocafeJohnDoeId}`
    );

    await upsertRole(trx, {
      id: "backoffice",
      title: "Backoffice",
      description: "Administrators with backoffice access",
      created_at: now,
      updated_at: now,
    });
    console.log("Ensured backoffice role exists");

    await upsertGrant(trx, {
      id: "users:list",
      title: "List users",
      description: "Let see all users in the system",
      created_at: now,
      updated_at: now,
    });
    console.log("Ensured users:list grant exists");

    await trx("auth.roles_users")
      .insert({
        app_id: "lingocafe",
        role_id: "backoffice",
        user_id: lingocafeJohnDoeId,
        created_at: now,
      })
      .onConflict(["app_id", "user_id", "role_id"])
      .ignore();
    console.log("Associated LingoCafe John Doe test user with backoffice role");

    await trx("auth.roles_grants")
      .insert({
        app_id: "lingocafe",
        role_id: "backoffice",
        grant_id: "users:list",
        created_at: now,
      })
      .onConflict(["app_id", "role_id", "grant_id"])
      .ignore();
    console.log("Associated users:list grant with LingoCafe backoffice role");
  });
};
