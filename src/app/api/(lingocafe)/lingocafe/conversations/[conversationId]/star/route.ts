import { protectRoute } from "@/42go/policy";
import {
  conversationErrorResponse,
  conversationJson,
  mutateConversationState,
} from "@/app/api/(lingocafe)/lingocafe/_lib/conversations";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";

const mutateStar = async (
  active: boolean,
  { params }: { params: Promise<{ conversationId: string }> }
) => {
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
      await mutateConversationState({
        userId,
        conversationId,
        kind: "star",
        active,
      })
    );
  } catch (error) {
    return conversationErrorResponse(error);
  }
};

const starConversation = (req: Request, context: { params: Promise<{ conversationId: string }> }) => {
  void req.url;
  return mutateStar(true, context);
};
const unstarConversation = (req: Request, context: { params: Promise<{ conversationId: string }> }) => {
  void req.url;
  return mutateStar(false, context);
};

export const PUT = protectRoute(starConversation, {
  require: { feature: "api:lingocafe", session: true },
});
export const DELETE = protectRoute(unstarConversation, {
  require: { feature: "api:lingocafe", session: true },
});
