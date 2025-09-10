import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy/protectRoute";

const getNote = async (req: Request) => {
  void req.url;
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // Expecting .../api/notes/{bucket}/{uuid}
  const bucket = parts[parts.length - 2];
  const uuid = parts[parts.length - 1];

  if (!bucket || !uuid) {
    return Response.json(
      { error: "bad_request", message: "bucket and uuid required" },
      { status: 400 }
    );
  }

  const db = getDB();
  try {
    const res = await db.raw("SELECT * FROM notes.get(?, ?, ?)", [
      bucket,
      uuid,
      "1 hour",
    ]);
    const rows = res.rows as Array<{
      title: string;
      body: string;
      created_at: string | Date;
      time_left_seconds: number;
    }>;
    if (!rows || rows.length === 0) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    const r = rows[0];
    return Response.json({
      title: r.title,
      body: r.body,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      timeLeft:
        typeof r.time_left_seconds === "number"
          ? r.time_left_seconds
          : Number(r.time_left_seconds),
    });
  } catch (err) {
    console.error("GET /api/notes/{bucket}/{uuid} failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const GET = protectRoute(getNote, {
  require: { feature: "api:notes" },
});
