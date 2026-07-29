/**
 * Seed default app test users.
 * @param { import("knex").Knex } knex
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

exports.seed = async function seedDefaultTestUsers(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();

    const adminId = await upsertUser(trx, {
      app_id: "default",
      id: uuidv4(),
      username: "admin",
      name: "Admin",
      email: "admin@admin.com",
      password: await hashPassword("admin"),
      image: "https://ui-avatars.com/api/?name=Admin+Admin",
      created_at: now,
      updated_at: now,
    });
    console.log(`Created default Admin test user with ID: ${adminId}`);

    const johnDoeId = await upsertUser(trx, {
      app_id: "default",
      id: uuidv4(),
      username: "john",
      name: "John Doe",
      email: "john.doe@example.com",
      password: await hashPassword("john"),
      image: "https://api.dicebear.com/8.x/adventurer/svg?seed=john-doe",
      created_at: now,
      updated_at: now,
    });
    console.log(`Created default John Doe test user with ID: ${johnDoeId}`);

    const janeDoeId = await upsertUser(trx, {
      app_id: "default",
      id: uuidv4(),
      username: "jane",
      name: "Jane Doe",
      email: "jane.doe@example.com",
      password: await hashPassword("jane"),
      image: "https://api.dicebear.com/8.x/adventurer/svg?seed=jane-doe",
      created_at: now,
      updated_at: now,
    });
    console.log(`Created default Jane Doe test user with ID: ${janeDoeId}`);

    await upsertGrant(trx, {
      id: "users:list",
      title: "List users",
      description: "Let see all users in the system",
      created_at: now,
      updated_at: now,
    });

    await upsertGrant(trx, {
      id: "users:edit",
      title: "Edit user",
      description: "Let edit a user account",
      created_at: now,
      updated_at: now,
    });

    await upsertGrant(trx, {
      id: "users:delete",
      title: "Delete user",
      description: "Let erase a user account",
      created_at: now,
      updated_at: now,
    });

    await trx("auth.roles_users")
      .insert([
        {
          role_id: "backoffice",
          user_id: adminId,
          app_id: "default",
          created_at: now,
        },
        {
          role_id: "foo",
          user_id: adminId,
          app_id: "default",
          created_at: now,
        },
      ])
      .onConflict(["app_id", "user_id", "role_id"])
      .ignore();
    console.log("Associated default admin test user with roles");

    await trx("auth.roles_grants")
      .insert([
        {
          role_id: "backoffice",
          grant_id: "users:list",
          app_id: "default",
          created_at: now,
        },
        {
          role_id: "backoffice",
          grant_id: "users:edit",
          app_id: "default",
          created_at: now,
        },
        {
          role_id: "backoffice",
          grant_id: "users:delete",
          app_id: "default",
          created_at: now,
        },
      ])
      .onConflict(["app_id", "role_id", "grant_id"])
      .ignore();
    console.log("Associated default backoffice role with users grants");
  });
};
