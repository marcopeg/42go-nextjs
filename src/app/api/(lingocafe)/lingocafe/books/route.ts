import { protectRoute } from "@/42go/policy";
import { getSessionUserId, json, loadReaderData } from "../_lib/reader";

const getBooks = async () => {
  const userId = await getSessionUserId();
  if (!userId) {
    return json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  return json(await loadReaderData(userId));
};

export const GET = protectRoute(getBooks, {
  require: { feature: "api:lingocafe", session: true },
});
