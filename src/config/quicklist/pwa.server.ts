import "server-only";

import { getServerSession } from "next-auth";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getDB } from "@/42go/db";
import { createPWAInstallTargetStartUrl } from "@/42go/pwa/install-target-context";
import type { TPWAInstallTargetResolver } from "@/42go/pwa/types";

type QuicklistInstallRow = {
  id: string;
  title: string;
};

const isUUID = (value: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );

export const resolveQuicklistProjectInstallTarget: TPWAInstallTargetResolver =
  async ({ appId, params }) => {
    const projectId = params.projectId;
    if (appId !== "quicklist" || !projectId || !isUUID(projectId)) return null;

    const session = await getServerSession(await getAuthOptions());
    const userId = session?.user?.id;
    if (!userId) return null;

    const db = getDB();
    const rows = (
      await db.raw(
        `
          SELECT p.id, p.title
            FROM quicklist.projects p
           WHERE p.id = ?
             AND p.app_id = ?
             AND (
               p.owned_by = ?
               OR EXISTS (
                 SELECT 1
                   FROM quicklist.collabs c
                  WHERE c.project_id = p.id
                    AND c.user_id = ?
               )
             )
           LIMIT 1
        `,
        [projectId, appId, userId, userId]
      )
    ).rows as QuicklistInstallRow[];

    const project = rows[0];
    if (!project) return null;

    const targetId = `/quicklists/${project.id}`;
    const startUrl = createPWAInstallTargetStartUrl({
      startUrl: targetId,
      targetId,
    });

    return {
      id: targetId,
      name: project.title,
      shortName: project.title,
      startUrl,
      manifestPath: `${targetId}/install`,
      private: true,
    };
  };
