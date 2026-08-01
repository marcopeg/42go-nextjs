import { protectRoute } from "@/42go/policy";
import { quickShareApiError, quickShareApiJson } from "@/lib/quickshare/server/api-response";
import { getQuickShareSessionPrincipal } from "@/lib/quickshare/server/session-principal";
import {
  createQuickShareApiTokenCredential,
  deleteQuickShareApiToken,
  getQuickShareApiTokenStatus,
  QuickShareApiTokenLifecycleError,
  rotateQuickShareApiTokenCredential,
} from "@/lib/quickshare/server/api-token-store";
import { getDB } from "@/42go/db";
import { z } from "zod";

const getPrincipal = async () => getQuickShareSessionPrincipal();

const unauthenticated = () =>
  quickShareApiError(401, "session_required", "Login to QuickShare first.");

const rotationSchema = z.object({ expectedUpdatedAt: z.string().datetime() });

const lifecycleError = (error: unknown): Response | null => {
  if (!(error instanceof QuickShareApiTokenLifecycleError)) return null;
  if (error.code === "token_missing") {
    return quickShareApiError(404, error.code, "Create a token first.");
  }
  if (error.code === "token_changed") {
    return quickShareApiError(409, error.code, "The token changed. Reload and try again.");
  }
  return quickShareApiError(409, error.code, "Rotate the existing token instead.");
};

const getStatus = async () => {
  const principal = await getPrincipal();
  if (!principal) return unauthenticated();

  return quickShareApiJson({
    status: await getQuickShareApiTokenStatus(getDB(), principal),
  });
};

const createToken = async () => {
  const principal = await getPrincipal();
  if (!principal) return unauthenticated();

  try {
    return quickShareApiJson(
      await createQuickShareApiTokenCredential(getDB(), principal),
      { status: 201 }
    );
  } catch (error) {
    const response = lifecycleError(error);
    if (response) return response;
    throw error;
  }
};

const rotateToken = async (request: Request) => {
  const principal = await getPrincipal();
  if (!principal) return unauthenticated();

  const input = rotationSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return quickShareApiError(422, "invalid_payload", "A current token version is required.");
  }

  try {
    return quickShareApiJson(
      await rotateQuickShareApiTokenCredential(
        getDB(),
        principal,
        input.data.expectedUpdatedAt
      )
    );
  } catch (error) {
    const response = lifecycleError(error);
    if (response) return response;
    throw error;
  }
};

const disableToken = async () => {
  const principal = await getPrincipal();
  if (!principal) return unauthenticated();

  await deleteQuickShareApiToken(getDB(), principal);
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
};

const policy = { require: { feature: "api:quickshare", session: true } } as const;

export const GET = protectRoute(getStatus, policy);
export const POST = protectRoute(createToken, policy);
export const PUT = protectRoute(rotateToken, policy);
export const DELETE = protectRoute(disableToken, policy);
