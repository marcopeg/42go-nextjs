import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import { QUICKLIST_MODES } from "@/lib/quicklists/mode";
import {
  isQuicklistApiContext,
  loadQuicklistApiContext,
} from "@/lib/quicklists/server/api-context";
import { quicklistApiError, quicklistApiJson } from "@/lib/quicklists/server/api-response";
import { serializeQuicklistApiList } from "@/lib/quicklists/server/api-serialization";

const createSchema = z.object({
  title: z.string().trim().min(1).max(255).default("New list"),
  mode: z.enum(QUICKLIST_MODES).default("todo"),
  items: z.array(z.string().trim().min(1).max(255)).max(100).default([]),
});

const encodeCursor = (row: { updated_at: Date; id: string }) =>
  Buffer.from(`${row.updated_at.toISOString()}|${row.id}`, "utf8").toString(
    "base64url"
  );

const decodeCursor = (value: string | null) => {
  if (!value) return null;
  try {
    const [updatedAt, id] = Buffer.from(value, "base64url")
      .toString("utf8")
      .split("|");
    const date = new Date(updatedAt);
    return id && !Number.isNaN(date.getTime()) ? { updatedAt: date, id } : null;
  } catch {
    return null;
  }
};

const listQuicklists = async (req: Request) => {
  const context = await loadQuicklistApiContext(req);
  if (!isQuicklistApiContext(context)) return context;

  const url = new URL(req.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 50);
  const limit = Math.max(1, Math.min(100, Number.isFinite(requestedLimit) ? requestedLimit : 50));
  const cursorValue = url.searchParams.get("cursor");
  const cursor = decodeCursor(cursorValue);
  if (cursorValue && !cursor) {
    return quicklistApiError(400, "validation", "Invalid cursor.");
  }

  const query = context.db("quicklist.projects as project")
    .leftJoin("quicklist.collabs as collab", function () {
      this.on("collab.project_id", "=", "project.id").andOnVal(
        "collab.user_id",
        "=",
        context.principal.userId
      );
    })
    .select(
      "project.id",
      "project.title",
      "project.settings",
      "project.created_at",
      "project.updated_at",
      context.db.raw("project.owned_by = ? AS owned", [context.principal.userId]),
      context.db.raw(
        "CASE WHEN project.owned_by = ? THEN 'owner' ELSE collab.role END AS role",
        [context.principal.userId]
      )
    )
    .where("project.app_id", context.principal.appId)
    .andWhere("project.api_enabled", true)
    .andWhere((builder) => {
      builder
        .where("project.owned_by", context.principal.userId)
        .orWhereNotNull("collab.user_id");
    })
    .orderBy("project.updated_at", "desc")
    .orderBy("project.id", "desc")
    .limit(limit + 1);

  if (cursor) {
    query.andWhere((builder) => {
      builder
        .where("project.updated_at", "<", cursor.updatedAt)
        .orWhere((sameDate) => {
          sameDate
            .where("project.updated_at", cursor.updatedAt)
            .andWhere("project.id", "<", cursor.id);
        });
    });
  }

  const rows = (await query) as Array<{
    id: string;
    title: string;
    settings: unknown;
    created_at: Date;
    updated_at: Date;
    owned: boolean;
    role: string;
  }>;
  const page = rows.slice(0, limit);
  const nextCursor =
    rows.length > limit && page.length > 0
      ? encodeCursor(page[page.length - 1])
      : null;

  return quicklistApiJson({
    lists: page.map(serializeQuicklistApiList),
    nextCursor,
  });
};

const createQuicklist = async (req: Request) => {
  const context = await loadQuicklistApiContext(req);
  if (!isQuicklistApiContext(context)) return context;

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return quicklistApiError(400, "validation", parsed.error.message);
  }

  const result = await context.db.transaction(async (trx) => {
    const [project] = await trx("quicklist.projects")
      .insert({
        app_id: context.principal.appId,
        title: parsed.data.title,
        settings: { mode: parsed.data.mode },
        api_enabled: true,
        owned_by: context.principal.userId,
        created_by: context.principal.userId,
        updated_by: context.principal.userId,
      })
      .returning([
        "id",
        "title",
        "settings",
        "created_at",
        "updated_at",
      ]);

    if (parsed.data.items.length > 0) {
      await trx("quicklist.tasks").insert(
        parsed.data.items.map((title, index) => ({
          project_id: project.id,
          title,
          position: index + 1,
          created_by: context.principal.userId,
        }))
      );
    }

    return project;
  });

  return quicklistApiJson(
    { list: serializeQuicklistApiList({ ...result, owned: true, role: "owner" }) },
    { status: 201 }
  );
};

const policy = { require: { feature: "api:quicklists" } } as const;

export const GET = protectRoute(listQuicklists, policy);
export const POST = protectRoute(createQuicklist, policy);
