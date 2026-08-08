import { NextResponse } from "next/server";

import { getDB } from "@/42go/db";
import { getAppInfo } from "@/42go/config/app-config";
import { getEmailProviderConfig } from "@/42go/auth/lib/email/config";
import { recordEmailAuthEvent } from "@/42go/auth/lib/email/events";
import { hashEmailToken } from "@/42go/auth/lib/email/token";
import { normalizeEmailCode } from "@/42go/auth/lib/email/utils";
import { validateAuthEmail } from "@/42go/auth/lib/email/validation";

const INVALID_VERIFICATION_CODE_MESSAGE = "Invalid verification code.";

const safeInternalPath = (input?: string | null): string => {
  if (!input || typeof input !== "string") return "/dashboard";
  const trimmed = input.trim();
  if (!trimmed.startsWith("/") || trimmed.includes("://") || trimmed.includes("\\")) {
    return "/dashboard";
  }
  return trimmed.replace(/\/+/, "/");
};

const getPublicOrigin = (req: Request) => {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");

  if (host) {
    return `${forwardedProto || new URL(req.url).protocol.replace(":", "")}://${host}`;
  }

  return new URL(req.url).origin;
};

const expectsJson = (req: Request) =>
  req.headers.get("content-type")?.includes("application/json") ?? false;

const readVerificationInput = async (req: Request) => {
  if (expectsJson(req)) {
    const body = await req.json();
    return {
      callbackUrl: String(body?.callbackUrl || ""),
      code: String(body?.code || ""),
      email: String(body?.email || ""),
    };
  }

  const form = await req.formData();
  return {
    callbackUrl: String(form.get("callbackUrl") || ""),
    code: String(form.get("code") || ""),
    email: String(form.get("email") || ""),
  };
};

const verificationError = (
  req: Request,
  options: {
    email?: string;
    error?: "EmailSignin" | "Verification";
    status?: number;
  } = {}
) => {
  const error = options.error || "Verification";

  if (expectsJson(req)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error === "Verification"
            ? INVALID_VERIFICATION_CODE_MESSAGE
            : "Email sign-in is unavailable.",
      },
      { status: options.status || 400 }
    );
  }

  const search = new URLSearchParams({ error });
  if (options.email) search.set("email", options.email);

  return NextResponse.redirect(
    new URL(`/login?${search.toString()}`, getPublicOrigin(req)),
    303
  );
};

export const POST = async (req: Request) => {
  const { id: appId, config } = await getAppInfo();
  const emailProvider = config?.auth?.providers.find(
    (provider) => provider.type === "email"
  );

  if (!appId || !emailProvider || emailProvider.type !== "email") {
    return verificationError(req, { error: "EmailSignin", status: 404 });
  }

  const emailConfig = getEmailProviderConfig(emailProvider.config);

  try {
    const input = await readVerificationInput(req);
    const validation = validateAuthEmail(input.email);

    if (!validation.ok) {
      return verificationError(req);
    }

    const identifier = validation.email;
    const code = normalizeEmailCode(input.code, emailConfig.code);
    const callbackUrl = safeInternalPath(input.callbackUrl);
    const tokenHash = hashEmailToken(code);
    const token = await getDB()("auth.verification_tokens")
      .where({
        app_id: appId,
        identifier,
        token: tokenHash,
      })
      .first();

    if (!token || new Date(token.expires).getTime() < Date.now()) {
      await recordEmailAuthEvent({
        appId,
        identifier,
        name: "auth.email.login-failed",
        config: emailConfig,
        data: { reason: token ? "expired_code" : "invalid_code" },
      });

      return verificationError(req, { email: identifier, status: 401 });
    }

    await recordEmailAuthEvent({
      appId,
      identifier,
      name: "auth.email.code-verified",
      config: emailConfig,
    });

    const callback = new URL("/api/auth/callback/email", getPublicOrigin(req));
    callback.searchParams.set("callbackUrl", callbackUrl);
    callback.searchParams.set("token", code);
    callback.searchParams.set("email", identifier);

    if (expectsJson(req)) {
      return NextResponse.json({
        ok: true,
        callbackUrl: `${callback.pathname}${callback.search}`,
      });
    }

    return NextResponse.redirect(callback, 303);
  } catch (error) {
    console.error("Email code verification failed:", error);
    return verificationError(req, { status: 500 });
  }
};
