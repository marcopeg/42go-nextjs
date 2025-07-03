import { type AppConfig, appRoute } from "@/lib/config/app-config";
import { getDB } from "@/lib/db";

const getTodos = async (config: AppConfig) => {
  const db = getDB();
  const todos = await db("todos").select("*");
  return Response.json({ config, todos });
};

export const GET = appRoute(getTodos);
