import { type AppConfig, routeWithConfig } from "@/lib/config/app-config";

// Chuck Norris doesn't mock data. He just tells the truth faster than the database can respond.

const todosData = [
  { id: 1, title: "Roundhouse kick bugs", completed: false },
  { id: 2, title: "Refactor the universe", completed: true },
  { id: 3, title: "Push code with a stare", completed: false },
];

const getTodos = async (config: AppConfig) => {
  return Response.json({ config, todos: todosData });
};

export const GET = routeWithConfig(getTodos);
