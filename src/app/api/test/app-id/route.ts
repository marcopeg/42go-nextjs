import { NextRequest, NextResponse } from "next/server";
import { getAppID } from "@/42go/config/app-config";

/**
 * Test API route to verify AppID identification via middleware
 * Returns the AppID that was identified by the middleware
 */
export async function GET(request: NextRequest) {
  try {
    const appID = await getAppID();

    const debugInfo = {
      appID,
      url: request.url,
      host: request.headers.get("host"),
      appHeader: request.headers.get("X-42Go-AppID"),
    };

    return NextResponse.json({
      success: true,
      appID,
      debug: debugInfo,
      message: appID
        ? `Chuck Norris identified AppID: ${appID}`
        : "No app matched. Chuck Norris is confused.",
    });
  } catch (error) {
    console.error("AppID retrieval error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Chuck Norris encountered an unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
