import { NextResponse } from "next/server";

import { getDB } from "@/42go/db";
import { getAppInfo } from "@/42go/config/app-config";
import { getEmailProviderConfig } from "@/42go/auth/lib/email/config";
import { recordEmailAuthEvent } from "@/42go/auth/lib/email/events";
import { hashEmailToken } from "@/42go/auth/lib/email/token";
import {
  normalizeEmailCode,
  normalizeEmailIdentifier,
} from "@/42go/auth/lib/email/utils";

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

export const POST = async (req: Request) => {
  const { id: appId, config } = await getAppInfo();
  const emailProvider = config?.auth?.providers.find(
    (provider) => provider.type === "email"
  );

  if (!appId || !emailProvider || emailProvider.type !== "email") {
    return NextResponse.redirect(
      new URL("/login?error=EmailSignin", getPublicOrigin(req)),
      303
    );
  }

  const emailConfig = getEmailProviderConfig(emailProvider.config);

  try {
    const form = await req.formData();
    const identifier = normalizeEmailIdentifier(String(form.get("email") || ""));
    const code = normalizeEmailCode(String(form.get("code") || ""), emailConfig.code);
    const callbackUrl = safeInternalPath(String(form.get("callbackUrl") || ""));
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

      return NextResponse.redirect(
        new URL(
          `/login?error=Verification&email=${encodeURIComponent(identifier)}`,
          getPublicOrigin(req)
        ),
        303
      );
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

    return NextResponse.redirect(callback, 303);
  } catch (error) {
    console.error("Email code verification failed:", error);
    return NextResponse.redirect(
      new URL("/login?error=Verification", getPublicOrigin(req)),
      303
    );
  }
};
