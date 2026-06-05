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

exports.seed = async function seedLingocafeTestUsers(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();

    const adminId = await upsertUser(trx, {
      app_id: "lingocafe",
      id: uuidv4(),
      username: "admin",
      name: "LingoCafe Admin",
      email: "admin@lingocafe.app",
      password: await hashPassword("admin"),
      image: "https://ui-avatars.com/api/?name=LingoCafe+Admin",
      created_at: now,
      updated_at: now,
    });
    console.log(`Created LingoCafe Admin test user with ID: ${adminId}`);

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
      .where({
        app_id: "lingocafe",
        role_id: "backoffice",
        user_id: johnDoeId,
      })
      .del();
    console.log("Removed LingoCafe John Doe test user's backoffice role");

    await trx("auth.roles_users")
      .insert({
        app_id: "lingocafe",
        role_id: "backoffice",
        user_id: adminId,
        created_at: now,
      })
      .onConflict(["app_id", "user_id", "role_id"])
      .ignore();
    console.log("Associated LingoCafe Admin test user with backoffice role");

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
