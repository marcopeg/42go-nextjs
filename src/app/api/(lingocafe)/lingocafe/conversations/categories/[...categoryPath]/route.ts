import { protectRoute } from "@/42go/policy";
import {
  conversationErrorResponse,
  conversationJson,
  loadConversationCategory,
} from "@/app/api/(lingocafe)/lingocafe/_lib/conversations";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";

const getCategory = async (
  req: Request,
  { params }: { params: Promise<{ categoryPath: string[] }> }
) => {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return conversationJson(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }
    const { categoryPath } = await params;
    const requestedBand = new URL(req.url).searchParams.get("band");
    return conversationJson(
      await loadConversationCategory({
        userId,
        categoryPath,
        requestedBand,
      })
    );
  } catch (error) {
    return conversationErrorResponse(error);
  }
};

export const GET = protectRoute(getCategory, {
  require: { feature: "api:lingocafe", session: true },
});
