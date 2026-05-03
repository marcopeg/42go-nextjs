/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Create a transaction to ensure all operations succeed or fail together
  await knex.transaction(async (trx) => {
    // Delete existing data in reverse order of dependencies
    // Clear other schemas that reference auth.users first (quicklist, lingocafe)
    console.log("Clearing existing data...");
    // quicklist dependent tables must be cleared before deleting users
    try {
      await trx.withSchema("quicklist").from("collabs").del();
      await trx.withSchema("quicklist").from("invites").del();
      await trx.withSchema("quicklist").from("tasks").del();
      await trx.withSchema("quicklist").from("projects").del();
    } catch (e) {
      // If quicklist schema/tables don't exist yet, ignore the error
      // (this seed may run in environments without quicklist)
      console.log("quicklist cleanup skipped:", e.message || e);
    }

    try {
      await trx.withSchema("lingocafe").from("books_progress").del();
      await trx.withSchema("lingocafe").from("profiles").del();
    } catch (e) {
      // If lingocafe schema/tables don't exist yet, ignore the error
      console.log("lingocafe cleanup skipped:", e.message || e);
    }

    await trx("auth.roles_grants").del();
    await trx("auth.roles_users").del();
    await trx("auth.grants").del();
    await trx("auth.roles").del();
    await trx("auth.users").del();
    await trx("auth.accounts").del();
    await trx("auth.verification_tokens").del();

    // Add the backoffice role with a text ID
    const backofficeRoleId = "backoffice";
    await trx("auth.roles").insert({
      id: backofficeRoleId,
      title: "Backoffice",
      description: "Administrators with backoffice access",
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created backoffice role with ID: ${backofficeRoleId}`);

    const fooRoleId = "foo";
    await trx("auth.roles").insert({
      id: fooRoleId,
      title: "foo",
      description: "Administrators with foo access",
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created foo role with ID: ${fooRoleId}`);

    const faaRoleId = "faa";
    await trx("auth.roles").insert({
      id: faaRoleId,
      title: "faa",
      description: "Administrators with faa access",
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created faa role with ID: ${faaRoleId}`);

    // Add backoffice grants (Wildcard patterns removed: grant matching is now literal-only)

    const usersListGrantId = "users:list";
    await trx("auth.grants").insert({
      id: usersListGrantId,
      title: "List users",
      description: "Let see all users in the system",
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created backoffice grant with ID: ${usersListGrantId}`);

    const usersEditGrantId = "users:edit";
    await trx("auth.grants").insert({
      id: usersEditGrantId,
      title: "Edit user",
      description: "Let apply changes to a user",
      created_at: new Date(),
      updated_at: new Date(),
    });
    console.log(`Created backoffice grant with ID: ${usersEditGrantId}`);

    // Associate the users list to the backoffice role
    await trx("auth.roles_grants").insert({
      role_id: backofficeRoleId,
      grant_id: usersListGrantId,
      app_id: "default",
      created_at: new Date(),
    });
    console.log(`Associated backoffice grant with backoffice role`);
  });

  console.log("Seed completed successfully!");
};
