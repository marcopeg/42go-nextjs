import { recordEvent } from "@/42go/events/server";
import type { EmailProviderConfig } from "@/42go/auth/lib/providers/types";

type EmailEventName =
  | "auth.email.requested"
  | "auth.email.resent"
  | "auth.email.code-verified"
  | "auth.email.login-failed";

const EVENT_KEY_BY_NAME = {
  "auth.email.requested": "requested",
  "auth.email.resent": "resent",
  "auth.email.code-verified": "codeVerified",
  "auth.email.login-failed": "loginFailed",
} satisfies Record<EmailEventName, keyof NonNullable<EmailProviderConfig["events"]>>;

export const recordEmailAuthEvent = async ({
  appId,
  userId,
  identifier,
  name,
  config,
  data = {},
}: {
  appId: string;
  userId?: string | null;
  identifier: string;
  name: EmailEventName;
  config?: EmailProviderConfig;
  data?: Record<string, unknown>;
}) => {
  const eventKey = EVENT_KEY_BY_NAME[name];
  if (config?.events?.[eventKey] === false) return;

  try {
    await recordEvent({
      appId,
      userId: userId || `email:${identifier}`,
      name,
      data: {
        identifier,
        ...data,
      },
    });
  } catch (error) {
    console.error(`Email auth event logging failed for ${name}:`, error);
  }
};
