import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { z } from "zod";
import { getAppID } from "@/42go/config/app-config";

const emailSchema = z.object({ email: z.string().email().min(3).max(255) });

const badRequest = (message: string) =>
  Response.json(
    { error: "bad_request", message, timestamp: new Date().toISOString() },
    { status: 400 }
  );

const forbidden = (message = "forbidden") =>
  Response.json(
    { error: "forbidden", message, timestamp: new Date().toISOString() },
    { status: 403 }
  );

export const POST = protectRoute(
  async (req, { params }) => {
    const { projectId } = await params;
    if (!projectId) return badRequest("invalid projectId");

    const session = await getServerSession(await getAuthOptions());
    const userId = session?.user?.id as string | undefined;
    const userEmail = (session?.user?.email || "").toLowerCase();
    if (!userId) {
      return Response.json(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("invalid json body");
    }
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }
    const email = parsed.data.email.trim().toLowerCase();

    const db = getDB();
    const appId = await getAppID(req);
    if (!appId) {
      return Response.json(
        { error: "app_not_found", message: "Unable to determine app context" },
        { status: 404 }
      );
    }

    try {
      return await db.transaction(async (trx) => {
        const projRow = (
          await trx.raw(
            `SELECT p.id, p.owned_by
             FROM quicklist.projects p
            WHERE p.id = ? AND p.app_id = ? AND p.owned_by = ?`,
            [projectId, appId, userId]
          )
        ).rows as Array<{ id: string; owned_by: string }>;
        if (projRow.length === 0) return forbidden("only owner can invite");

        // Limit check: invites + collabs < 10
        const invitesCountRow = await trx("quicklist.invites")
          .where({ project_id: projectId })
          .count<{ count: string }>("*")
          .first();
        const collabsCountRow = await trx("quicklist.collabs")
          .where({ project_id: projectId })
          .count<{ count: string }>("*")
          .first();
        const invitesCount = Number(invitesCountRow?.count || 0);
        const collabsCount = Number(collabsCountRow?.count || 0);
        if (invitesCount + collabsCount >= 10) {
          return Response.json(
            { error: "limit", message: "limit reached" },
            { status: 409 }
          );
        }

        // Duplicate invite
        const dup = await trx("quicklist.invites")
          .where({ project_id: projectId, email })
          .first();
        if (dup) {
          return Response.json(
            { error: "conflict", message: "already invited" },
            { status: 409 }
          );
        }

        // Resolve email to user (if exists) and block inviting owner/self/collaborator
        // Limit user resolution to the same app (avoid cross-app collisions)
        const userRow = (await trx("auth.users")
          .select("id", "email")
          .whereRaw("LOWER(email) = ?", [email])
          .andWhere("app_id", appId)
          .first()) as { id: string; email: string } | undefined;

        if (email === userEmail) {
          return Response.json(
            { error: "conflict", message: "cannot invite yourself" },
            { status: 409 }
          );
        }

        if (userRow) {
          if (userRow.id === projRow[0].owned_by) {
            return Response.json(
              { error: "conflict", message: "cannot invite owner" },
              { status: 409 }
            );
          }
          const existingCollab = await trx("quicklist.collabs")
            .where({ project_id: projectId, user_id: userRow.id })
            .first();
          if (existingCollab) {
            return Response.json(
              { error: "conflict", message: "already collaborator" },
              { status: 409 }
            );
          }
        }

        const inserted = await trx("quicklist.invites")
          .insert({ project_id: projectId, email, created_by: userId })
          .returning(["email", "created_at", "created_by", "expires_at"]);

        // touch project updated_at for freshness
        await trx("quicklist.projects")
          .where({ id: projectId })
          .update({ updated_at: new Date(), updated_by: userId });

        const inv = inserted[0];
        return Response.json({ ok: true, invite: inv });
      });
    } catch (err) {
      console.error("POST invites failed", err);
      return Response.json(
        {
          error: "server_error",
          message: (err as Error)?.message || "Unknown",
        },
        { status: 500 }
      );
    }
  },
  {
    require: { feature: "api:quicklists", session: true },
  }
);
