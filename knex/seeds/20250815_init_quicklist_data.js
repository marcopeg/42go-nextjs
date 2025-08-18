/**
 * Seed Quicklist demo data
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

exports.seed = async function seed(knex) {
  await knex.transaction(async (trx) => {
    // Resolve users by email
    const getUserByEmail = async (email) => {
      const row = await trx("auth.users").select("id").where({ email }).first();
      if (!row) throw new Error(`Missing user with email ${email}`);
      return row.id;
    };

    const adminId = await getUserByEmail("admin@admin.com");
    const johnId = await getUserByEmail("john.doe@example.com");
    const janeId = await getUserByEmail("jane.doe@example.com");

    // Clean existing quicklist data (order matters for FKs)
    await trx.withSchema("quicklist").from("collabs").del();
    await trx.withSchema("quicklist").from("invites").del();
    await trx.withSchema("quicklist").from("tasks").del();
    await trx.withSchema("quicklist").from("projects").del();

    const now = new Date();

    // Create projects for John
    const groceryProjectId = uuidv4();
    const kiteProjectId = uuidv4();

    await trx
      .withSchema("quicklist")
      .into("projects")
      .insert([
        {
          id: groceryProjectId,
          title: "grocery list",
          created_at: now,
          updated_at: now,
          created_by: johnId,
          updated_by: johnId,
          owned_by: johnId,
          app_id: "default",
        },
        {
          id: kiteProjectId,
          title: "kite surfing",
          created_at: now,
          updated_at: now,
          created_by: johnId,
          updated_by: johnId,
          owned_by: johnId,
          app_id: "default",
        },
      ]);

    // Add couple of items to each project
    await trx
      .withSchema("quicklist")
      .into("tasks")
      .insert([
        {
          id: uuidv4(),
          project_id: groceryProjectId,
          title: "milk",
          position: 1,
          created_at: now,
          updated_at: now,
          created_by: johnId,
        },
        {
          id: uuidv4(),
          project_id: groceryProjectId,
          title: "eggs",
          position: 2,
          created_at: now,
          updated_at: now,
          created_by: johnId,
        },
        {
          id: uuidv4(),
          project_id: kiteProjectId,
          title: "check wind forecast",
          position: 1,
          created_at: now,
          updated_at: now,
          created_by: johnId,
        },
        {
          id: uuidv4(),
          project_id: kiteProjectId,
          title: "pack gear",
          position: 2,
          created_at: now,
          updated_at: now,
          created_by: johnId,
        },
      ]);

    // Add an invite for admin (to grocery list)
    await trx.withSchema("quicklist").into("invites").insert({
      project_id: groceryProjectId,
      email: "admin@admin.com",
      created_at: now,
      created_by: johnId,
      expires_at: null,
    });

    // Add a collab for Jane (to kite surfing)
    await trx.withSchema("quicklist").into("collabs").insert({
      project_id: kiteProjectId,
      user_id: janeId,
      role: "editor",
      created_at: now,
    });

    // Touch projects' updated_at/updated_by (simulate auto-update semantics)
    await trx
      .withSchema("quicklist")
      .from("projects")
      .whereIn("id", [groceryProjectId, kiteProjectId])
      .update({ updated_at: new Date(), updated_by: johnId });
  });
};
