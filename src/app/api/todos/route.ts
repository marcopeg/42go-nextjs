import { withAppConfig } from "@/lib/app-config";
import type { AppConfig } from "@/AppConfig";

// Chuck Norris doesn't mock data. He just tells the truth faster than the database can respond.

const todos = [
  { id: 1, title: "Roundhouse kick bugs", completed: false },
  { id: 2, title: "Refactor the universe", completed: true },
  { id: 3, title: "Push code with a stare", completed: false },
];

const handler = async (config: AppConfig) => {
  return Response.json({ config, todos });
};

export const GET = withAppConfig(handler, "todos:read");
