import { NextResponse } from "next/server";
import { getDB } from "@/42go/db";
import { v4 as uuidv4 } from "uuid";
import { appRoute } from "@/42go/config/app-config";

import type { AppConfig } from "@/AppConfig";

const feedback = async (_config: AppConfig, request: Request) => {
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
    // Insert feedback into database
    await db("feedbacks").insert({
      id: uuidv4(),
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

export const POST = appRoute(feedback);
