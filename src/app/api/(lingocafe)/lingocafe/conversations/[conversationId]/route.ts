import { protectRoute } from "@/42go/policy";
import {
  conversationErrorResponse,
  conversationJson,
  loadConversationDetail,
} from "@/app/api/(lingocafe)/lingocafe/_lib/conversations";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";

const getConversation = async (
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) => {
  void req.url;
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return conversationJson(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }
    const { conversationId } = await params;
    return conversationJson(
      await loadConversationDetail({ userId, conversationId })
    );
  } catch (error) {
    return conversationErrorResponse(error);
  }
};

export const GET = protectRoute(getConversation, {
  require: { feature: "api:lingocafe", session: true },
});
