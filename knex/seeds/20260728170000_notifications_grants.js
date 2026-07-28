/**
 * Ensure notification grants exist after app-specific test-user seeds and
 * assign them to every app-scoped backoffice role.
 *
 * @param { import("knex").Knex } knex
 */
exports.seed = async function seedNotificationGrants(knex) {
  await knex.transaction(async (trx) => {
    const now = new Date();
    const grants = [
      ["notifications:list", "List notifications", "View app notification management"],
      ["notifications:create", "Create notifications", "Create app notification drafts"],
      ["notifications:edit", "Edit notifications", "Edit app notification drafts"],
      ["notifications:publish", "Publish notifications", "Publish or abort app notifications"],
      ["notifications:delete", "Delete notifications", "Permanently delete app notifications"],
    ];
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
    if (apps.length === 0) return;
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
  });
};
