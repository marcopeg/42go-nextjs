import { protectRoute } from "@/42go/policy";
import { z } from "zod";
import {
  conversationErrorResponse,
  conversationJson,
  loadConversationDetail,
  saveConversationProgress,
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

const progressPayloadSchema = z.object({
  progress_bps: z.number().int().min(0).max(10000),
});

const trackConversationScroll = async (
  req: Request,
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
    const parsed = progressPayloadSchema.safeParse(
      await req.json().catch(() => null)
    );
    if (!parsed.success) {
      return conversationJson(
        { error: "validation", message: "Invalid conversation scroll payload." },
        { status: 400 }
      );
    }
    const { conversationId } = await params;
    return conversationJson(
      await saveConversationProgress({
        userId,
        conversationId,
        progressBps: parsed.data.progress_bps,
      })
    );
  } catch (error) {
    return conversationErrorResponse(error);
  }
};

export const GET = protectRoute(getConversation, {
  require: { feature: "api:lingocafe", session: true },
});

export const POST = protectRoute(trackConversationScroll, {
  require: { feature: "api:lingocafe", session: true },
});
