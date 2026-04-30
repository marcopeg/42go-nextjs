import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy/protectRoute";
import { z } from "zod";

// Enhanced parameter validation schemas
const bucketSchema = z
  .string()
  .min(4, "Invalid bucket ID")
  .max(14, "Invalid bucket ID")
  .regex(/^[0-9]+$/, "Bucket ID must contain only digits")
  .refine(
    (val) => [4, 6, 8, 10, 12, 14].includes(val.length),
    "Invalid bucket ID length"
  )
  .refine((val) => !/['"`;\\<>]/.test(val), "Invalid bucket ID characters");

const uuidSchema = z.string().uuid("Invalid UUID format");

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

  // Validate bucket parameter against injection
  const bucketValidation = bucketSchema.safeParse(bucket);
  if (!bucketValidation.success) {
    return Response.json(
      { error: "bad_request", message: "Invalid bucket ID format" },
      { status: 400 }
    );
  }

  // Validate UUID parameter
  const uuidValidation = uuidSchema.safeParse(uuid);
  if (!uuidValidation.success) {
    return Response.json(
      { error: "bad_request", message: "Invalid UUID format" },
      { status: 400 }
    );
  }

  const safeBucket = bucketValidation.data;
  const safeUuid = uuidValidation.data;

  const db = getDB();
  try {
    const res = await db.raw("SELECT * FROM notes.get(?, ?, ?)", [
      safeBucket,
      safeUuid,
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
    const url = new URL(req.url);
    if (url.searchParams.has("raw")) {
      return new Response(r.body, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
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
    // Don't expose internal error details
    return Response.json(
      { error: "server_error", message: "Failed to retrieve note" },
      { status: 500 }
    );
  }
};

export const GET = protectRoute(getNote, {
  require: { feature: "api:notes" },
});
