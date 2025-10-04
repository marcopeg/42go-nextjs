import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { z } from "zod";
import { getAppID } from "@/42go/config/app-config";

type ProjectRow = {
  id: string;
  title: string;
  updated_at: Date;
  role: string;
  owned: boolean;
};

type InviteRow = {
  project_id: string;
  email: string;
  title: string;
  created_at: Date;
  owner_username: string;
  owner_email: string;
};

const toISO = (d: Date | string): string =>
  (d instanceof Date ? d : new Date(d)).toISOString();

const clampLimit = (val: number | null | undefined): number => {
  const n = typeof val === "number" && Number.isFinite(val) ? val : 50;
  return Math.max(1, Math.min(100, n));
};

const encodeCursor = (row: { updated_at: Date; id: string }): string => {
  const payload = `${row.updated_at.toISOString()}|${row.id}`;
  return Buffer.from(payload, "utf8").toString("base64url");
};

const decodeCursor = (
  cursor: string | null
): { updatedAt: Date; id: string } | null => {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [iso, id] = raw.split("|");
    if (!iso || !id) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return { updatedAt: d, id };
  } catch {
    return null;
  }
};

const getQuicklists = async (req: Request) => {
  // Touch url so linter doesn’t complain; protectRoute uses it for inference
  void req.url;

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id as string | undefined;
  const userEmail = session?.user?.email as string | undefined;
  if (!userId || !userEmail) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");
  const limit = clampLimit(limitParam ? Number(limitParam) : 50);
  const cursor = decodeCursor(cursorParam);

  const db = getDB();
  const appId = await getAppID();
  if (!appId) {
    return Response.json(
      { error: "app_not_found", message: "Unable to determine app context" },
      { status: 404 }
    );
  }

  // Build projects query via raw SQL for DISTINCT ON semantics and stable ordering.
  const params: unknown[] = [userId, appId, userId, appId];
  let whereCursor = "";
  if (cursor) {
    // (updated_at, id) < (cursorUpdatedAt, cursorId)
    whereCursor = "WHERE (d.updated_at < ? OR (d.updated_at = ? AND d.id < ?))";
  }
  if (cursor) {
    params.push(cursor.updatedAt, cursor.updatedAt, cursor.id);
  }
  params.push(limit + 1);

  const projectsSql = `
    WITH owned AS (
      SELECT p.id, p.title, p.updated_at, 'owner'::text AS role, TRUE AS owned
  FROM quicklist.projects p
  WHERE p.owned_by = ? AND p.app_id = ?
    ), collab AS (
      SELECT p.id, p.title, p.updated_at, c.role::text AS role, FALSE AS owned
      FROM quicklist.collabs c
  JOIN quicklist.projects p ON p.id = c.project_id
  WHERE c.user_id = ? AND p.app_id = ?
    ), unioned AS (
      SELECT * FROM owned
      UNION ALL
      SELECT * FROM collab
    ), dedup AS (
      SELECT DISTINCT ON (id) id, title, updated_at, role, owned
      FROM unioned
      ORDER BY id, owned DESC, updated_at DESC
    )
    SELECT d.id, d.title, d.updated_at, d.role, d.owned
    FROM dedup d
    ${whereCursor}
    ORDER BY d.updated_at DESC, d.id DESC
    LIMIT ?
  `;

  const rows = (await db.raw(projectsSql, params)).rows as ProjectRow[];

  let nextCursor: string | undefined;
  let pageRows = rows;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    nextCursor = encodeCursor({ updated_at: last.updated_at, id: last.id });
    pageRows = rows.slice(0, limit);
  }

  const projects = pageRows.map((r) => ({
    id: r.id,
    title: r.title,
    owned: !!r.owned,
    role: r.role,
    updated_at: toISO(r.updated_at),
  }));

  // Invites for current email, include owner's username and email
  const invitesRows = (
    await db
      .select<InviteRow[]>(
        db.raw(
          `i.project_id, i.email, p.title, i.created_at,
           COALESCE(u.name, split_part(u.email, '@', 1)) as owner_username,
           u.email as owner_email`
        )
      )
      .from("quicklist.invites as i")
      .join("quicklist.projects as p", "p.id", "i.project_id")
      .join("auth.users as u", function () {
        this.on("p.owned_by", "=", "u.id").andOn("u.app_id", "=", "p.app_id");
      })
      .whereRaw("LOWER(i.email) = LOWER(?)", [userEmail])
      .andWhere("p.app_id", appId)
      .andWhere((qb) => {
        qb.whereNull("i.expires_at").orWhere("i.expires_at", ">", db.fn.now());
      })
      .orderBy("i.created_at", "desc")
  ).map((r) => ({
    project_id: r.project_id,
    email: r.email,
    title: r.title,
    created_at: toISO(r.created_at),
    owner_username: r.owner_username,
    owner_email: r.owner_email,
  }));

  return Response.json(
    { projects, invites: invitesRows, nextCursor },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
};

export const GET = protectRoute(getQuicklists, {
  require: {
    feature: "api:quicklists",
    session: true,
  },
});

// Create a new project with two default tasks
const createProjectSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    // Optional custom tasks; if not provided, default tasks will be used
    tasks: z.array(z.string().min(1).max(255)).max(50).optional(),
  })
  .optional();

const createProject = async (req: Request) => {
  void req.url;

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  let body: unknown = undefined;
  try {
    body = await req.json();
  } catch {
    // allow empty body
    body = undefined;
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "bad_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const title = (parsed.data?.title ?? "New list").trim();
  const tasks = parsed.data?.tasks ?? ["Task 1", "Task 2"];

  const db = getDB();
  const appId = await getAppID();
  if (!appId) {
    return Response.json(
      { error: "app_not_found", message: "Unable to determine app context" },
      { status: 404 }
    );
  }

  try {
    return await db.transaction(async (trx) => {
      const projectRows = await trx("quicklist.projects")
        .insert({
          title,
          created_by: userId,
          updated_by: userId,
          owned_by: userId,
          app_id: appId,
        })
        .returning(["id", "title"]);

      const project = projectRows[0] as { id: string; title: string };

      // Insert default tasks with positions 1..n
      if (tasks.length > 0) {
        const rows = tasks.map((t, idx) => ({
          project_id: project.id,
          title: t,
          position: idx + 1,
          created_by: userId,
        }));
        await trx("quicklist.tasks").insert(rows);
      }

      // Bump project updated_at
      await trx("quicklist.projects")
        .where({ id: project.id })
        .update({ updated_at: new Date(), updated_by: userId });

      return Response.json(
        { id: project.id, title: project.title },
        {
          status: 201,
        }
      );
    });
  } catch (err) {
    console.error("POST quicklists create project failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const POST = protectRoute(createProject, {
  require: {
    feature: "api:quicklists",
    session: true,
  },
});

const deleteProjectSchema = z.object({
  id: z.string().uuid(),
});

const deleteProject = async (req: Request) => {
  void req.url;

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  let body: unknown = undefined;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "bad_request", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const parsed = deleteProjectSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "bad_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const { id } = parsed.data;
  const db = getDB();
  const appId = await getAppID();
  if (!appId) {
    return Response.json(
      { error: "app_not_found", message: "Unable to determine app context" },
      { status: 404 }
    );
  }

  try {
    return await db.transaction(async (trx) => {
      // Check if user owns this project
      const project = await trx("quicklist.projects")
        .where({ id, app_id: appId })
        .first();

      if (!project) {
        return Response.json(
          { error: "not_found", message: "Project not found" },
          { status: 404 }
        );
      }

      if (project.owned_by !== userId) {
        return Response.json(
          { error: "forbidden", message: "Only project owner can delete" },
          { status: 403 }
        );
      }

      // Delete related data first (tasks, collabs, invites)
      await trx("quicklist.tasks").where({ project_id: id }).del();
      await trx("quicklist.collabs").where({ project_id: id }).del();
      await trx("quicklist.invites").where({ project_id: id }).del();

      // Delete the project
      await trx("quicklist.projects").where({ id }).del();

      return Response.json({ success: true });
    });
  } catch (err) {
    console.error("DELETE quicklists project failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const DELETE = protectRoute(deleteProject, {
  require: {
    feature: "api:quicklists",
    session: true,
  },
});
