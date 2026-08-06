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

const backofficeGrants = [
  ["users:list", "List users", "View app users"],
  ["users:edit", "Edit users", "Edit app users"],
  ["users:delete", "Delete users", "Delete app users"],
  ["notifications:list", "List notifications", "View app notification management"],
  ["notifications:create", "Create notifications", "Create app notification drafts"],
  ["notifications:edit", "Edit notifications", "Edit app notification drafts"],
  ["notifications:publish", "Publish notifications", "Publish or abort app notifications"],
  ["notifications:delete", "Delete notifications", "Permanently delete app notifications"],
];

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
    let adminId;
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
      if (account.username === "admin") adminId = id;
      console.log(`Created QuickShare ${account.username} test user with ID: ${id}`);
    }

    if (!adminId) throw new Error("QuickShare admin seed user was not created");

    await trx("auth.roles")
      .insert({
        id: "backoffice",
        title: "Backoffice",
        description: "Administrators with backoffice access",
        created_at: now,
        updated_at: now,
      })
      .onConflict("id")
      .ignore();

    await trx("auth.grants")
      .insert(
        backofficeGrants.map(([id, title, description]) => ({
          id,
          title,
          description,
          created_at: now,
          updated_at: now,
        }))
      )
      .onConflict("id")
      .ignore();

    await trx("auth.roles_users")
      .insert({
        app_id: "quickshare",
        role_id: "backoffice",
        user_id: adminId,
        created_at: now,
      })
      .onConflict(["app_id", "user_id", "role_id"])
      .ignore();

    await trx("auth.roles_grants")
      .insert(
        backofficeGrants.map(([grantId]) => ({
          app_id: "quickshare",
          role_id: "backoffice",
          grant_id: grantId,
          created_at: now,
        }))
      )
      .onConflict(["app_id", "role_id", "grant_id"])
      .ignore();

    console.log("Associated QuickShare admin with backoffice users and notifications access");
  });
};
