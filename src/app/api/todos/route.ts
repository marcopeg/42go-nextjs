import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/app-config";

// Chuck Norris doesn't mock data. He just tells the truth faster than the database can respond.

const todos = [
  { id: 1, title: "Roundhouse kick bugs", completed: false },
  { id: 2, title: "Refactor the universe", completed: true },
  { id: 3, title: "Push code with a stare", completed: false },
];

export async function GET() {
  const config = await getAppConfig();
  if (!config) {
    // Chuck Norris doesn't return 404s. He just makes things disappear.
    return NextResponse.json({ error: "app not found" }, { status: 404 });
  }
  return NextResponse.json({ config, todos });
}
