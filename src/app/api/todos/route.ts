import { getAppConfig, type TAppConfig } from "@/42go/config/app-config";
import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";

const getTodos = async (req: Request) => {
  // Touch url so linter doesn’t complain; protectRoute uses it for inference
  void req.url;
  const config: TAppConfig = await getAppConfig();
  if (!config)
    return new Response(JSON.stringify({ error: "app not found" }), {
      status: 404,
    });
  const db = getDB();
  const todos = await db("todos").select("*");
  return Response.json({ config, todos });
};

export const GET = protectRoute(getTodos, [
  {
    require: {
      feature: "api:todos",
    },
    onFail: {
      status: 408,
      message: "not a feature",
    },
  },
  {
    require: {
      session: true,
    },
    onFail: {
      message: "get a grip",
    },
  },
  {
    require: {
      role: "foo",
      grants: ["users:list"],
    },
    onFail: {
      status: 422,
      message: "Get off!",
    },
  },
]);
