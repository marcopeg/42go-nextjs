import { type AppConfig, appRoute } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";

const getTodos = async (config: AppConfig) => {
  const db = getDB();
  const todos = await db("todos").select("*");
  return Response.json({ config, todos });
};

export const GET = appRoute(getTodos, "todos");
