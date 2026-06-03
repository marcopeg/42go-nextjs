import type { EmailProviderConfig } from "@/42go/auth/lib/providers/types";
import { parseEmailDurationSeconds } from "@/42go/auth/lib/email/duration";

export const DEFAULT_EMAIL_CODE_CONFIG = {
  length: 6,
  mode: "digits",
  caseSensitive: false,
  duration: "5m",
} satisfies Required<NonNullable<EmailProviderConfig["code"]>>;

export const DEFAULT_EMAIL_EVENTS_CONFIG = {
  requested: true,
  resent: true,
  codeVerified: true,
  loginFailed: true,
} satisfies Required<NonNullable<EmailProviderConfig["events"]>>;

export const DEFAULT_EMAIL_THROTTLE_DELAY = [
  "30s",
  "1m",
  "2m",
  "3m",
  "5m",
  "10m",
] satisfies NonNullable<EmailProviderConfig["throttle"]>["delay"];

export const DEFAULT_EMAIL_THROTTLE_CONFIG = {
  delay: DEFAULT_EMAIL_THROTTLE_DELAY,
  message: "Wait before requesting another sign-in email.",
} satisfies NonNullable<EmailProviderConfig["throttle"]>;

export const DEFAULT_EMAIL_LOGIN_UI_CONFIG = {
  primaryActionLabel: "Send me a magic link",
} satisfies Required<NonNullable<EmailProviderConfig["ui"]>>;

export const getEmailProviderConfig = (
  config?: Partial<EmailProviderConfig>
): EmailProviderConfig => {
  const resolvedConfig: EmailProviderConfig = {
    code: {
      ...DEFAULT_EMAIL_CODE_CONFIG,
      ...(config?.code || {}),
    },
    throttle: {
      ...DEFAULT_EMAIL_THROTTLE_CONFIG,
      ...(config?.throttle || {}),
    },
    events: {
      ...DEFAULT_EMAIL_EVENTS_CONFIG,
      ...(config?.events || {}),
    },
    ui: {
      ...DEFAULT_EMAIL_LOGIN_UI_CONFIG,
      ...(config?.ui || {}),
    },
    strategies: {
      console: { type: "console" },
      ...(config?.strategies || {}),
    },
    useStrategy: config?.useStrategy || process.env.EMAIL_AUTH_SENDER || "console",
    from: config?.from || process.env.EMAIL_AUTH_FROM || "42Go <no-reply@example.com>",
  };

  parseEmailDurationSeconds(
    resolvedConfig.code!.duration!,
    "auth.providers[].config.code.duration"
  );
  if (resolvedConfig.throttle!.delay!.length === 0) {
    throw new Error(
      "auth.providers[].config.throttle.delay must contain at least one duration."
    );
  }
  resolvedConfig.throttle!.delay!.forEach((delay, index) => {
    parseEmailDurationSeconds(
      delay,
      `auth.providers[].config.throttle.delay[${index}]`
    );
  });

  return resolvedConfig;
};
