import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy/protectRoute";
import { z } from "zod";

const createNote = async (req: Request) => {
  void req.url;

  let body: unknown = undefined;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "bad_request", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const bodySchema = z.object({
    title: z.string().min(1).max(255),
    body: z.string().min(1).max(10000),
  });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "bad_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const safeTitle = parsed.data.title.trim();
  const safeBody = parsed.data.body;

  const db = getDB();

  try {
    // Call the Postgres function notes.add(title, body) which returns bucket_id and out_id
    const res = await db.raw("SELECT * FROM notes.add(?, ?)", [
      safeTitle,
      safeBody,
    ]);
    const row = res.rows && res.rows[0];
    if (!row) {
      return Response.json(
        { error: "server_error", message: "no result from notes.add" },
        { status: 500 }
      );
    }

    return Response.json(
      { bucket: row.bucket_id, uuid: row.out_id },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/notes failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const POST = protectRoute(createNote, {
  require: { feature: "api:notes" },
});
