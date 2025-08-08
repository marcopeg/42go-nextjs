import { NextRequest, NextResponse } from "next/server";
import { getAppName } from "@/42go/config/app-config";

/**
 * Test API route to verify app name identification via middleware
 * Returns the app name that was identified by the middleware
 */
export async function GET(request: NextRequest) {
  try {
    // Get the app name identified by middleware
    const appName = await getAppName();

    // Collect debug information
    const debugInfo = {
      appName,
      url: request.url,
      host: request.headers.get("host"),
      appHeader: request.headers.get("X-App-Name"),
    };

    return NextResponse.json({
      success: true,
      appName,
      debug: debugInfo,
      message: appName
        ? `Chuck Norris identified app: ${appName}`
        : "No app matched. Chuck Norris is confused.",
    });
  } catch (error) {
    console.error("App name retrieval error:", error);

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
