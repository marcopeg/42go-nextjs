import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { z } from "zod";
import { getAppIDFromHeaders } from "@/42go/config/app-config";

type FreshnessRow = {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  freshness: Date; // GREATEST(updated_at, MAX(tasks.updated_at), MAX(tasks.completed_at))
};

type TaskRow = {
  id: string;
  title: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
};

const toISO = (d: Date | string | null | undefined): string | null =>
  d ? (d instanceof Date ? d : new Date(d)).toISOString() : null;

const isUUID = (v: string): boolean =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    v
  );

const weakETag = (projectId: string, freshness: Date): string => {
  // Format: YYMMDDhhmmss (simple, URL-safe timestamp)
  const year = freshness.getUTCFullYear().toString().slice(-2);
  const month = (freshness.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = freshness.getUTCDate().toString().padStart(2, "0");
  const hour = freshness.getUTCHours().toString().padStart(2, "0");
  const minute = freshness.getUTCMinutes().toString().padStart(2, "0");
  const second = freshness.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}${second}`;
};

const parseIfNoneMatch = (req: Request): string | null => {
  const v = req.headers.get("if-none-match");
  if (!v) return null;
  // Could be a list; we only support single-value usage here
  return v.split(",")[0].trim();
};

// Normalize ETag: drop weak prefix and quotes for stable comparisons
const normalizeETag = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const trimmed = s.trim();
  const withoutWeak = trimmed.replace(/^W\//i, "");
  return withoutWeak.replace(/^\"|\"$/g, "");
};

const notFound = () =>
  Response.json(
    {
      error: "not_found",
      message: "Not Found",
      timestamp: new Date().toISOString(),
    },
    { status: 404 }
  );

const badRequest = (message: string) =>
  Response.json(
    { error: "bad_request", message, timestamp: new Date().toISOString() },
    { status: 400 }
  );

const getProject = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  // Touch url so linter doesn’t complain; protectRoute may infer feature
  void req.url;

  const { projectId } = await params;
  if (!projectId || !isUUID(projectId)) return badRequest("invalid projectId");

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  const db = getDB();
  const appId = getAppIDFromHeaders(req.headers) || "default";

  // Access control baked into WHERE clause: owner or collab
  const freshnessSql = `
    SELECT p.id, p.title, p.created_at, p.updated_at,
           GREATEST(
             p.updated_at,
             COALESCE(MAX(t.updated_at), to_timestamp(0)),
             COALESCE(MAX(t.completed_at), to_timestamp(0))
           ) AS freshness
  FROM quicklist.projects p
      LEFT JOIN quicklist.tasks t ON t.project_id = p.id
     WHERE p.id = ? AND p.app_id = ?
       AND (p.owned_by = ? OR EXISTS (
             SELECT 1 FROM quicklist.collabs c
              WHERE c.project_id = p.id AND c.user_id = ?
           ))
     GROUP BY p.id, p.title, p.created_at, p.updated_at
  `;

  const fres = (await db.raw(freshnessSql, [projectId, appId, userId, userId]))
    .rows as FreshnessRow[];
  if (fres.length === 0) return notFound();

  const p = fres[0];
  const eTag = weakETag(p.id, p.freshness);
  console.log("Project freshness:", p.freshness, eTag);
  const lastMod = p.freshness.toUTCString();

  // Support either header If-None-Match or query param ?t=<etag>
  const url = new URL(req.url);
  const tParam = url.searchParams.get("t");
  const inm = parseIfNoneMatch(req);

  // Simple string comparison for timestamp-based etags
  if ((tParam && tParam === eTag) || (inm && normalizeETag(inm) === eTag)) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: eTag,
        "Last-Modified": lastMod,
        "Cache-Control": "private, must-revalidate",
      },
    });
  }

  const tasksSql = `
    SELECT id, title, position, created_at, updated_at, completed_at
      FROM quicklist.tasks
     WHERE project_id = ?
     ORDER BY position ASC, created_at ASC
  `;
  const tasks = (await db.raw(tasksSql, [projectId])).rows as TaskRow[];

  const body = {
    etag: eTag,
    project: {
      id: p.id,
      title: p.title,
      created_at: toISO(p.created_at),
      updated_at: toISO(p.updated_at),
    },
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      position: t.position,
      updated_at: toISO(t.updated_at),
      completed_at: toISO(t.completed_at),
    })),
  };

  return Response.json(body, {
    headers: {
      ETag: eTag,
      "Last-Modified": lastMod,
      "Cache-Control": "private, must-revalidate",
    },
  });
};

export const GET = protectRoute(getProject, {
  require: {
    feature: "api:quicklists",
    session: true,
  },
});

// Create a new task in the project
const createSchema = z.object({
  title: z.string().min(1).max(255),
  position: z.number().int().min(1).optional(),
});

const createTask = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  void req.url;

  const { projectId } = await params;
  if (!projectId || !isUUID(projectId)) return badRequest("invalid projectId");

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  let body: unknown = {};
  try {
    // Allow empty body (UI may call without payload while mocking); default to {}
    body = (await req.json()) ?? {};
  } catch {
    // No body provided; treat as bad request since title is required
    return badRequest("invalid json body");
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "bad_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const { title, position } = parsed.data as {
    title: string;
    position?: number;
  };

  const db = getDB();
  const appId = getAppIDFromHeaders(req.headers) || "default";
  try {
    return await db.transaction(async (trx) => {
      // Ensure user has access to the project (owner or collaborator)
      const access = (
        await trx.raw(
          `SELECT 1 FROM quicklist.projects p
       WHERE p.id = ? AND p.app_id = ?
             AND (p.owned_by = ? OR EXISTS (
                   SELECT 1 FROM quicklist.collabs c
                   WHERE c.project_id = p.id AND c.user_id = ?
                 ))`,
          [projectId, appId, userId, userId]
        )
      ).rows as Array<Record<string, unknown>>;
      if (access.length === 0) return notFound();

      let newPosition: number;
      if (typeof position === "number") {
        // Clamp position between 1 and (count + 1)
        const countRow = await trx("quicklist.tasks")
          .where({ project_id: projectId })
          .count<{ count: string }>("*")
          .first();
        const count = Number(countRow?.count ?? 0);
        const desired = Math.max(1, Math.min(count + 1, position));
        // Shift tasks at or after desired position
        await trx("quicklist.tasks")
          .where({ project_id: projectId })
          .andWhere("position", ">=", desired)
          .increment("position", 1);
        newPosition = desired;
      } else {
        // Append to the end: next position is max(position)+1
        const maxRow = await trx("quicklist.tasks")
          .where({ project_id: projectId })
          .max<{ max: number | null }>("position as max")
          .first();
        const max = Number(maxRow?.max ?? 0);
        newPosition = (Number.isFinite(max) ? max : 0) + 1;
      }

      const inserted = await trx("quicklist.tasks")
        .insert({
          project_id: projectId,
          title,
          position: newPosition,
          created_by: userId,
        })
        .returning(["id", "title", "position", "updated_at", "completed_at"]);

      // Update project freshness
      await trx("quicklist.projects")
        .where({ id: projectId })
        .update({ updated_at: new Date(), updated_by: userId });

      const row = inserted[0];
      return Response.json({
        ok: true,
        task: {
          id: row.id as string,
          title: row.title as string,
          position: row.position as number,
          updated_at: toISO(row.updated_at as Date),
          completed_at: toISO(row.completed_at as Date | null),
        },
      });
    });
  } catch (err) {
    console.error("POST quicklist task failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const POST = protectRoute(createTask, {
  require: {
    feature: "api:quicklists",
    session: true,
  },
});

// Update project title
const updateProjectSchema = z.object({
  title: z.string().min(1).max(255),
});

const updateProject = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await params;
  if (!projectId || !isUUID(projectId)) return badRequest("invalid projectId");

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  let body: unknown = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return badRequest("invalid json body");
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "bad_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const { title } = parsed.data;
  const db = getDB();
  try {
    const updated = await db("quicklist.projects")
      .where((qb) => {
        qb.where({ id: projectId }).andWhere((qb2) => {
          qb2.where("owned_by", userId).orWhereExists(function () {
            this.select(db.raw("1"))
              .from("quicklist.collabs as c")
              .whereRaw("c.project_id = quicklist.projects.id")
              .andWhere("c.user_id", userId);
          });
        });
      })
      .update({ title, updated_at: new Date(), updated_by: userId })
      .returning(["id", "title", "updated_at"]);

    if (!updated || updated.length === 0) return notFound();

    const row = updated[0];
    return Response.json({
      ok: true,
      project: {
        id: row.id as string,
        title: row.title as string,
        updated_at: toISO(row.updated_at as Date),
      },
    });
  } catch (err) {
    console.error("PATCH quicklist project failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const PATCH = protectRoute(updateProject, {
  require: { feature: "api:quicklists", session: true },
});
