import { protectRoute } from "@/42go/policy";
import {
  conversationErrorResponse,
  conversationJson,
  mutateConversationState,
} from "@/app/api/(lingocafe)/lingocafe/_lib/conversations";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";

const mutateRead = async (
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
        kind: "read",
        active,
      })
    );
  } catch (error) {
    return conversationErrorResponse(error);
  }
};

const markRead = (req: Request, context: { params: Promise<{ conversationId: string }> }) => {
  void req.url;
  return mutateRead(true, context);
};
const markUnread = (req: Request, context: { params: Promise<{ conversationId: string }> }) => {
  void req.url;
  return mutateRead(false, context);
};

export const PUT = protectRoute(markRead, {
  require: { feature: "api:lingocafe", session: true },
});
export const DELETE = protectRoute(markUnread, {
  require: { feature: "api:lingocafe", session: true },
});
