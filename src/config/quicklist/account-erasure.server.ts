import "server-only";

import {
  AccountErasureError,
  type AccountErasureHandler,
} from "@/42go/users/account-erasure/types";

export const accountErasureHandlers: AccountErasureHandler[] = [
  {
    id: "quicklist.account-erasure",
    label: "Quicklist data",
    order: 100,
    erase: async ({ appId, targetUser, trx }) => {
      const appProjectIds = () =>
        trx("quicklist.projects").select("id").where({ app_id: appId });

      const ownedProjects = await trx("quicklist.projects")
        .where({ app_id: appId, owned_by: targetUser.id })
        .pluck("id");

      let deletedProjects = 0;
      if (ownedProjects.length > 0) {
        deletedProjects = await trx("quicklist.projects")
          .whereIn("id", ownedProjects)
          .delete();
      }

      const deletedTasks = await trx("quicklist.tasks")
        .where({ created_by: targetUser.id })
        .whereIn("project_id", appProjectIds())
        .delete();

      const deletedInvites = await trx("quicklist.invites")
        .whereIn("project_id", appProjectIds())
        .andWhere((builder) => {
          builder
            .where({ created_by: targetUser.id })
            .orWhere({ email: targetUser.email });
        })
        .delete();

      const deletedCollabs = await trx("quicklist.collabs")
        .where({ user_id: targetUser.id })
        .whereIn("project_id", appProjectIds())
        .delete();

      const remainingCreatedProjects = (await trx("quicklist.projects")
        .where({ app_id: appId, created_by: targetUser.id })
        .count<{ count: string }[]>({ count: "*" }))[0]?.count;

      if (Number(remainingCreatedProjects || 0) > 0) {
        throw new AccountErasureError(
          "quicklist_created_projects_block_delete",
          "Quicklist has projects created by this user but owned by another user.",
          409
        );
      }

      return {
        id: "quicklist.account-erasure",
        label: "Quicklist data",
        deleted: {
          projects: deletedProjects,
          tasks: deletedTasks,
          invites: deletedInvites,
          collabs: deletedCollabs,
        },
      };
    },
  },
];
