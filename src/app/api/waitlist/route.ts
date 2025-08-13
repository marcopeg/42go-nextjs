import { NextResponse } from "next/server";
import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy/protectRoute";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const waitlist = async (request: Request) => {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const db = getDB();

    // Try to insert, ignore duplicate emails
    try {
      await db("waitlists").insert({
        email,
        ip_address: ip,
        user_agent: userAgent,
      });
    } catch (err) {
      // If duplicate, treat as success
      const code = (err as { code?: string })?.code;
      if (code !== "23505") throw err;
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
};

export const POST = protectRoute(waitlist, {
  require: { feature: "api:waitlist" },
});
