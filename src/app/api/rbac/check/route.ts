// Legacy RBAC realtime check endpoint has been decommissioned.
// Policy engine performs server-side authoritative evaluation.
// This route is kept temporarily (returns 410) to avoid 404 noise during transition.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      allowed: false,
      error: "Deprecated endpoint. Use policy.evaluatePolicy server-side.",
    },
    { status: 410 }
  );
}
