/**
 * Ensure notification grants exist after app-specific test-user seeds and
 * assign them to every app-scoped backoffice role.
 *
 * @param { import("knex").Knex } knex
 */
exports.seed = async function seedNotificationGrants(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();
    const demoCommunicationId = "seed-lingocafe-hello-world";
    const grants = [
      ["notifications:list", "List notifications", "View app notification management"],
      ["notifications:create", "Create notifications", "Create app notification drafts"],
      ["notifications:edit", "Edit notifications", "Edit app notification drafts"],
      ["notifications:publish", "Publish notifications", "Publish or abort app notifications"],
      ["notifications:delete", "Delete notifications", "Permanently delete app notifications"],
    ];

    await trx("auth.roles")
      .insert({
        id: "backoffice",
        title: "Backoffice",
        description: "Administrators with backoffice access",
        created_at: now,
        updated_at: now,
      })
      .onConflict("id")
      .merge(["title", "description", "updated_at"]);

    const adminUsers = await trx("auth.users")
      .select("app_id", "id")
      .where({ username: "admin" })
      .whereIn("app_id", ["default", "lingocafe"]);

    if (adminUsers.length > 0) {
      await trx("auth.roles_users")
        .insert(
          adminUsers.map(({ app_id, id }) => ({
            app_id,
            role_id: "backoffice",
            user_id: id,
            created_at: now,
          }))
        )
        .onConflict(["app_id", "user_id", "role_id"])
        .ignore();
    }

    await trx("auth.grants")
      .insert(
        grants.map(([id, title, description]) => ({
          id,
          title,
          description,
          created_at: now,
          updated_at: now,
        }))
      )
      .onConflict("id")
      .merge(["title", "description", "updated_at"]);

    const appResult = await trx.raw(`
      SELECT DISTINCT app_id
      FROM (
        SELECT app_id FROM auth.roles_users WHERE role_id = 'backoffice'
        UNION
        SELECT app_id FROM auth.roles_grants WHERE role_id = 'backoffice'
      ) scoped_backoffice_apps
    `);
    const apps = appResult.rows;
    if (apps.length > 0) {
      await trx("auth.roles_grants")
        .insert(
          apps.flatMap(({ app_id }) =>
            grants.map(([grant_id]) => ({
              app_id,
              role_id: "backoffice",
              grant_id,
              created_at: now,
            }))
          )
        )
        .onConflict(["app_id", "role_id", "grant_id"])
        .ignore();
    }

    const lingocafeAdmin = adminUsers.find(({ app_id }) => app_id === "lingocafe");
    if (!lingocafeAdmin) return;

    await trx("42go_data.communication_display_events")
      .where({
        app_id: "lingocafe",
        communication_id: demoCommunicationId,
      })
      .del();
    await trx("42go_data.communication_user_state")
      .where({
        app_id: "lingocafe",
        communication_id: demoCommunicationId,
      })
      .del();
    await trx("42go_data.communication_audience")
      .where({
        app_id: "lingocafe",
        communication_id: demoCommunicationId,
      })
      .del();

    await trx("42go_data.communications")
      .insert({
        id: demoCommunicationId,
        app_id: "lingocafe",
        channel: "in_app",
        kind: "notification",
        style: "info",
        priority: 5,
        audience_mode: "everyone",
        title: "Hello, LingoCafe!",
        subject: null,
        body_markdown:
          "This is a **Hello World** notification from the 42Go development seed.",
        link_url: null,
        media_url: null,
        media_type: null,
        reaction_template: "acknowledge",
        interaction_config: {},
        created_by: lingocafeAdmin.id,
        created_at: now,
        updated_at: now,
        available_from: null,
        available_until: null,
        published_at: now,
        aborted_at: null,
      })
      .onConflict(["app_id", "id"])
      .merge({
        channel: "in_app",
        kind: "notification",
        style: "info",
        priority: 5,
        audience_mode: "everyone",
        title: "Hello, LingoCafe!",
        subject: null,
        body_markdown:
          "This is a **Hello World** notification from the 42Go development seed.",
        link_url: null,
        media_url: null,
        media_type: null,
        reaction_template: "acknowledge",
        interaction_config: {},
        created_by: lingocafeAdmin.id,
        updated_at: now,
        available_from: null,
        available_until: null,
        published_at: now,
        aborted_at: null,
      });
  });
};
