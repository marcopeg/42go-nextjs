import { ZodError } from "zod";

import { getAppID } from "@/42go/config/app-config";
import {
  createCommunication,
  deleteCommunication,
  getCommunicationDetails,
  listAdminCommunications,
  searchAudienceUsers,
  transitionCommunication,
  updateCommunication,
} from "@/42go/communications/server";
import { evaluatePolicy, policyHttpStatus, protectRoute } from "@/42go/policy";
import type { Policy } from "@/42go/policy";
import { getSessionUserId } from "@/42go/policy/access";

const context = async () => {
  const [appId, userId] = await Promise.all([getAppID(), getSessionUserId()]);
  if (!appId || !userId) throw new Error("Authenticated app context is unavailable.");
  return { appId, userId };
};

const errorResponse = (error: unknown) => {
  const message =
    error instanceof ZodError
      ? error.issues[0]?.message || "Invalid communication."
      : error instanceof Error
        ? error.message
        : "Notification request failed.";
  return Response.json({ error: "notification_request_failed", message }, { status: 400 });
};

const requireGrant = async (grant: string) => {
  const result = await evaluatePolicy({
    policy: {
      require: {
        feature: "api:notifications",
        session: true,
        role: "backoffice",
        grants: [grant],
      },
    },
  });
  if (result.pass) return null;
  return Response.json(
    { error: result.error?.code, message: result.error?.detail || "Forbidden" },
    { status: policyHttpStatus(result.error!.code) }
  );
};

const getAdminNotifications = async (req: Request) => {
  try {
    const { appId } = await context();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const search = url.searchParams.get("users");
    if (id) return Response.json(await getCommunicationDetails(appId, id));
    if (search !== null) {
      return Response.json({ users: await searchAudienceUsers(appId, search) });
    }
    return Response.json({ items: await listAdminCommunications(appId) });
  } catch (error) {
    return errorResponse(error);
  }
};

const createAdminNotification = async (req: Request) => {
  const denied = await requireGrant("notifications:create");
  if (denied) return denied;
  try {
    const { appId, userId } = await context();
    return Response.json(await createCommunication(appId, userId, await req.json()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
};

const updateAdminNotification = async (req: Request) => {
  try {
    const body = (await req.json()) as { id?: unknown; action?: unknown; draft?: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) throw new Error("Communication ID is required.");
    const action = body.action === "publish" || body.action === "abort" ? body.action : "edit";
    const denied = await requireGrant(
      action === "edit" ? "notifications:edit" : "notifications:publish"
    );
    if (denied) return denied;
    const { appId } = await context();
    const result =
      action === "edit"
        ? await updateCommunication(appId, id, body.draft)
        : await transitionCommunication(appId, id, action);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
};

const deleteAdminNotification = async (req: Request) => {
  const denied = await requireGrant("notifications:delete");
  if (denied) return denied;
  try {
    const { appId } = await context();
    const body = (await req.json()) as { id?: unknown; confirmationTitle?: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) throw new Error("Communication ID is required.");
    await deleteCommunication(
      appId,
      id,
      typeof body.confirmationTitle === "string" ? body.confirmationTitle : null
    );
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
};

const listPolicy: Policy = {
  require: {
    feature: "api:notifications",
    session: true,
    role: "backoffice",
    grants: ["notifications:list"],
  },
};

export const GET = protectRoute(getAdminNotifications, listPolicy);
export const POST = protectRoute(createAdminNotification, {
  require: { feature: "api:notifications", session: true, role: "backoffice" },
});
export const PATCH = protectRoute(updateAdminNotification, {
  require: { feature: "api:notifications", session: true, role: "backoffice" },
});
export const DELETE = protectRoute(deleteAdminNotification, {
  require: { feature: "api:notifications", session: true, role: "backoffice" },
});
