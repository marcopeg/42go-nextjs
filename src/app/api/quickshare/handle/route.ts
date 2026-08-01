import { getAppID } from "@/42go/config/app-config";
import { protectRoute } from "@/42go/policy";
import { getSessionUserId } from "@/42go/policy/access";
import {
  changeQuickShareHandle,
  previewQuickShareHandleChange,
  QuickShareDomainError,
} from "@/lib/quickshare/server/account-service";
import { quickShareFilesystemPublisher } from "@/lib/quickshare/server/publication-service";
import { z } from "zod";

const schema = z.object({ handle: z.string(), confirmed: z.boolean().optional() });

const principal = async () => {
  const [appId, userId] = await Promise.all([getAppID(), getSessionUserId()]);
  if (!appId || !userId) throw new QuickShareDomainError("session_required", "Login required.", 401);
  return { appId, userId };
};

const fail = (error: unknown) => {
  if (error instanceof QuickShareDomainError) return Response.json({ error: error.code, message: error.message }, { status: error.status });
  if (error instanceof z.ZodError) return Response.json({ error: "invalid_payload", message: error.issues[0]?.message ?? "Invalid request." }, { status: 422 });
  console.error("QuickShare handle API error", error);
  return Response.json({ error: "quickshare_error", message: "QuickShare could not complete that request." }, { status: 500 });
};

export const POST = protectRoute(async (request: Request) => {
  try {
    const body = schema.parse(await request.json());
    return Response.json(await previewQuickShareHandleChange(await principal(), body.handle));
  } catch (error) {
    return fail(error);
  }
}, { require: { feature: "api:quickshare", session: true } });

export const PATCH = protectRoute(async (request: Request) => {
  try {
    const body = schema.parse(await request.json());
    return Response.json({ account: await changeQuickShareHandle(await principal(), body.handle, body.confirmed === true, {
      rename: quickShareFilesystemPublisher.renameAccountFolder,
    }) });
  } catch (error) {
    return fail(error);
  }
}, { require: { feature: "api:quickshare", session: true } });
