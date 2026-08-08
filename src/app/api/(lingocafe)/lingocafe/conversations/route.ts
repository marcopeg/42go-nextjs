import { protectRoute } from "@/42go/policy";
import {
  conversationErrorResponse,
  conversationJson,
  loadConversationBrowseValidator,
  loadConversationDiscovery,
} from "@/app/api/(lingocafe)/lingocafe/_lib/conversations";
import { getSessionUserId } from "@/app/api/(lingocafe)/lingocafe/_lib/reader";
import {
  conversationBrowseNotModified,
  conversationBrowseResponse,
  createConversationBrowseETag,
  matchesConversationBrowseETag,
} from "@/app/api/(lingocafe)/lingocafe/_lib/conversation-browse-response";

const getConversations = async (req: Request) => {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return conversationJson(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }
    const requestedBand = new URL(req.url).searchParams.get("band");
    const validator = await loadConversationBrowseValidator({ userId, requestedBand });
    const etag = createConversationBrowseETag(validator);
    if (matchesConversationBrowseETag(req.headers.get("if-none-match"), etag)) {
      return conversationBrowseNotModified(etag);
    }
    return conversationBrowseResponse(
      await loadConversationDiscovery({ userId, requestedBand }),
      etag
    );
  } catch (error) {
    return conversationErrorResponse(error);
  }
};

export const GET = protectRoute(getConversations, {
  require: { feature: "api:lingocafe", session: true },
});
