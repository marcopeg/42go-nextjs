import { NextResponse } from "next/server";

import { getAppInfo } from "@/42go/config/app-config";
import { getEmailProviderConfig } from "@/42go/auth/lib/email/config";
import { recordEmailAuthEvent } from "@/42go/auth/lib/email/events";
import { consumeEmailThrottle } from "@/42go/auth/lib/email/throttle";
import {
  getGenericInvalidEmailMessage,
  validateAuthEmail,
} from "@/42go/auth/lib/email/validation";

export const POST = async (req: Request) => {
  const { id: appId, config } = await getAppInfo();
  const emailProvider = config?.auth?.providers.find(
    (provider) => provider.type === "email"
  );

  if (!appId || !emailProvider || emailProvider.type !== "email") {
    return NextResponse.json({ ok: false, message: "Email sign-in is not available." }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const validation = validateAuthEmail(String(body.email || ""));

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, message: getGenericInvalidEmailMessage() },
        { status: 400 }
      );
    }

    const identifier = validation.email;
    const emailConfig = getEmailProviderConfig(emailProvider.config);
    const throttle = await consumeEmailThrottle({
      appId,
      identifier,
      config: emailConfig.throttle,
    });

    if (!throttle.allowed) {
      await recordEmailAuthEvent({
        appId,
        identifier,
        name: "auth.email.login-failed",
        config: emailConfig,
        data: { reason: "throttled" },
      });

      return NextResponse.json(
        {
          ok: false,
          message: throttle.message,
          retryAt: throttle.retryAt?.toISOString(),
        },
        { status: 429 }
      );
    }

    await recordEmailAuthEvent({
      appId,
      identifier,
      name: body.resend ? "auth.email.resent" : "auth.email.requested",
      config: emailConfig,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email sign-in request failed:", error);
    return NextResponse.json(
      { ok: false, message: "Email sign-in could not be started." },
      { status: 400 }
    );
  }
};
