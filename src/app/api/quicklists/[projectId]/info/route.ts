import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";

type FreshnessRow = {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  owned_by: string;
  freshness: Date;
};

type InviteRow = {
  email: string;
  created_at: Date;
  created_by: string;
  expires_at: Date | null;
  is_internal: boolean;
};

type CollabJoinRow = {
  user_id: string;
  role: string;
  created_at: Date;
  name: string | null;
  email: string | null;
};

const toISO = (d: Date | string | null | undefined): string | null =>
  d ? (d instanceof Date ? d : new Date(d)).toISOString() : null;

const isUUID = (v: string): boolean =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    v
  );

const weakETag = (freshness: Date): string => {
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
  return v.split(",")[0].trim();
};

const normalizeETag = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const withoutWeak = s.trim().replace(/^W\//i, "");
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

const getInfo = async (
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

  const db = getDB();
  const appId = await getAppID();
  if (!appId) {
    return Response.json(
      { error: "app_not_found", message: "Unable to determine app context" },
      { status: 404 }
    );
  }

  // Compute freshness including invites and collabs (and tasks for safety)
  const freshnessSql = `
    SELECT p.id, p.title, p.created_at, p.updated_at, p.owned_by,
           GREATEST(
             p.updated_at,
             COALESCE(MAX(t.updated_at), to_timestamp(0)),
             COALESCE(MAX(t.completed_at), to_timestamp(0)),
             COALESCE(MAX(i.created_at), to_timestamp(0)),
             COALESCE(MAX(c.created_at), to_timestamp(0))
           ) AS freshness
      FROM quicklist.projects p
      LEFT JOIN quicklist.tasks t ON t.project_id = p.id
      LEFT JOIN quicklist.invites i ON i.project_id = p.id
      LEFT JOIN quicklist.collabs c ON c.project_id = p.id
     WHERE p.id = ? AND p.app_id = ?
       AND (p.owned_by = ? OR EXISTS (
             SELECT 1 FROM quicklist.collabs c2
              WHERE c2.project_id = p.id AND c2.user_id = ?
           ))
     GROUP BY p.id, p.title, p.created_at, p.updated_at, p.owned_by
  `;

  const fres = (await db.raw(freshnessSql, [projectId, appId, userId, userId]))
    .rows as FreshnessRow[];
  if (fres.length === 0) return notFound();

  const p = fres[0];
  const eTag = weakETag(p.freshness);
  const lastMod = p.freshness.toUTCString();

  const url = new URL(req.url);
  const tParam = url.searchParams.get("t");
  const inm = parseIfNoneMatch(req);
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

  // Fetch invites and collabs (sorted newest first)
  const invitesSql = `
    SELECT i.email, i.created_at, i.created_by, i.expires_at,
           EXISTS (
             SELECT 1
               FROM auth.users u
               JOIN quicklist.projects p2 ON p2.id = i.project_id
              WHERE LOWER(u.email) = LOWER(i.email)
                AND u.app_id = p2.app_id
           ) AS is_internal
      FROM quicklist.invites i
     WHERE i.project_id = ?
     ORDER BY i.created_at DESC
  `;
  const collabsSql = `
    SELECT c.user_id, c.role, c.created_at, u.name, u.email
      FROM quicklist.collabs c
      LEFT JOIN auth.users u ON u.id = c.user_id
     WHERE c.project_id = ?
     ORDER BY c.created_at DESC
  `;

  const [invitesRes, collabsRes] = await Promise.all([
    db.raw(invitesSql, [projectId]),
    db.raw(collabsSql, [projectId]),
  ]);

  const invites = (invitesRes.rows as InviteRow[]).map((i) => ({
    email: i.email,
    created_at: toISO(i.created_at),
    created_by: i.created_by,
    expires_at: toISO(i.expires_at),
    is_internal: !!i.is_internal,
  }));
  const collabs = (collabsRes.rows as CollabJoinRow[]).map((c) => ({
    user_id: c.user_id,
    name: c.name || c.email || c.user_id,
    email: c.email || c.user_id,
    role: c.role,
    created_at: toISO(c.created_at),
  }));

  const body = {
    etag: eTag,
    project: {
      id: p.id,
      title: p.title,
      created_at: toISO(p.created_at),
      updated_at: toISO(p.updated_at),
      is_owner: p.owned_by === userId,
    },
    invites,
    collabs,
  };

  return Response.json(body, {
    headers: {
      ETag: eTag,
      "Last-Modified": lastMod,
      "Cache-Control": "private, must-revalidate",
    },
  });
};

export const GET = protectRoute(getInfo, {
  require: { feature: "api:quicklists", session: true },
});
