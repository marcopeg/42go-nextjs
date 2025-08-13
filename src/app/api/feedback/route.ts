import { NextResponse } from "next/server";
import { getDB } from "@/42go/db";
import { v4 as uuidv4 } from "uuid";
import { protectRoute } from "@/42go/policy/protectRoute";
import { getAppID } from "@/42go/config/app-config";

const feedback = async (request: Request) => {
  try {
    const { email, message, newsletter } = await request.json();

    // Validate input
    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required" },
        { status: 400 }
      );
    }
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get IP address and user agent
    const ip_address = request.headers.get("x-forwarded-for") || "unknown";
    const user_agent = request.headers.get("user-agent") || "unknown";

    const db = getDB();
    const app_id = (await getAppID()) || "default";
    // Insert feedback into database
    await db("feedbacks").insert({
      id: uuidv4(),
      app_id,
      email,
      message,
      newsletter_subscription: !!newsletter,
      ip_address,
      user_agent,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An error occurred while submitting your feedback" },
      { status: 500 }
    );
  }
};

export const POST = protectRoute(feedback, {
  require: { feature: "api:feedback" },
});
