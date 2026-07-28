import { getAppID } from "@/42go/config/app-config";
import {
  listCommunicationHistory,
  listEligibleCommunications,
  recordQualifiedDisplay,
  respondToCommunication,
} from "@/42go/communications/server";
import { getSessionUserId } from "@/42go/policy/access";
import { protectRoute } from "@/42go/policy";

const requireContext = async () => {
  const [appId, userId] = await Promise.all([getAppID(), getSessionUserId()]);
  if (!appId || !userId) throw new Error("Authenticated app context is unavailable.");
  return { appId, userId };
};

const getNotifications = async (req: Request) => {
  try {
    const { appId, userId } = await requireContext();
    const url = new URL(req.url);
    if (url.searchParams.get("view") === "history") {
      const history = await listCommunicationHistory(
        appId,
        userId,
        url.searchParams.get("cursor"),
        10
      );
      return Response.json(history);
    }
    return Response.json({
      items: await listEligibleCommunications(appId, userId),
    });
  } catch (error) {
    return Response.json(
      { error: "notifications_read_failed", message: error instanceof Error ? error.message : "Could not load notifications." },
      { status: 400 }
    );
  }
};

const postNotificationAction = async (req: Request) => {
  try {
    const { appId, userId } = await requireContext();
    const body = (await req.json()) as {
      action?: unknown;
      communicationId?: unknown;
      visitId?: unknown;
      response?: unknown;
    };
    const communicationId =
      typeof body.communicationId === "string" ? body.communicationId : "";
    if (!communicationId) throw new Error("Communication ID is required.");
    if (body.action === "display") {
      if (typeof body.visitId !== "string" || body.visitId.length > 100) {
        throw new Error("Visit ID is required.");
      }
      await recordQualifiedDisplay(appId, userId, communicationId, body.visitId);
      return Response.json({ ok: true });
    }
    if (body.action === "respond") {
      await respondToCommunication(
        appId,
        userId,
        communicationId,
        (body.response || {}) as never
      );
      return Response.json({ ok: true });
    }
    throw new Error("Unknown notification action.");
  } catch (error) {
    return Response.json(
      { error: "notifications_action_failed", message: error instanceof Error ? error.message : "Could not update notification." },
      { status: 400 }
    );
  }
};

const policy = {
  require: { feature: "api:notifications", session: true },
} as const;

export const GET = protectRoute(getNotifications, policy);
export const POST = protectRoute(postNotificationAction, policy);
