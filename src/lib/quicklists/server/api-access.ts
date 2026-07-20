import "server-only";

import type { Knex } from "knex";

import type { QuicklistApiPrincipal } from "@/lib/quicklists/server/api-token-store";

export type QuicklistApiProjectAccess = {
  id: string;
  title: string;
  settings: unknown;
  created_at: Date;
  updated_at: Date;
  owned_by: string;
  owned: boolean;
  role: string;
};

export const loadQuicklistApiProject = async (
  db: Knex,
  principal: QuicklistApiPrincipal,
  projectId: string
): Promise<QuicklistApiProjectAccess | null> => {
  const row = (await db("quicklist.projects as project")
    .leftJoin("quicklist.collabs as collab", function () {
      this.on("collab.project_id", "=", "project.id").andOnVal(
        "collab.user_id",
        "=",
        principal.userId
      );
    })
    .select(
      "project.id",
      "project.title",
      "project.settings",
      "project.created_at",
      "project.updated_at",
      "project.owned_by",
      db.raw("project.owned_by = ? AS owned", [principal.userId]),
      db.raw("CASE WHEN project.owned_by = ? THEN 'owner' ELSE collab.role END AS role", [
        principal.userId,
      ])
    )
    .where("project.id", projectId)
    .andWhere("project.app_id", principal.appId)
    .andWhere("project.api_enabled", true)
    .andWhere((builder) => {
      builder
        .where("project.owned_by", principal.userId)
        .orWhereNotNull("collab.user_id");
    })
    .first()) as QuicklistApiProjectAccess | undefined;

  return row || null;
};
