import type { SendVerificationRequestParams } from "next-auth/providers/email";

import type {
  EmailProviderConfig,
  EmailStrategyConfig,
} from "@/42go/auth/lib/providers/types";

type SendEmailInput = SendVerificationRequestParams & {
  appId: string;
  config: EmailProviderConfig;
};

const getSelectedStrategy = (config: EmailProviderConfig): EmailStrategyConfig => {
  const key = config.useStrategy || "console";
  return config.strategies?.[key] || { type: "console" };
};

const sendConsole = async ({ identifier, token, url, expires, appId }: SendEmailInput) => {
  console.info("[42go email auth] sign-in email", {
    appId,
    identifier,
    code: token,
    magicLink: url,
    expires: expires.toISOString(),
  });
};

const sendResend = async (input: SendEmailInput, sender: Extract<EmailStrategyConfig, { type: "resend" }>) => {
  const apiKey = "apiKey" in sender ? sender.apiKey : process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required for the Resend email sender.");
  }

  const from = sender.from || input.config.from || process.env.EMAIL_AUTH_FROM;
  if (!from) {
    throw new Error("Email sender `from` is required for Resend.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "42go-nextjs-email-auth",
    },
    body: JSON.stringify({
      from,
      to: input.identifier,
      subject: sender.subject || "Your sign-in code",
      html: [
        `<p>Your sign-in code is <strong>${input.token}</strong>.</p>`,
        `<p><a href="${input.url}">Sign in with this magic link</a></p>`,
        `<p>This request expires at ${input.expires.toISOString()}.</p>`,
      ].join(""),
      text: [
        `Your sign-in code is ${input.token}.`,
        `Magic link: ${input.url}`,
        `Expires: ${input.expires.toISOString()}`,
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend delivery failed: ${response.status} ${detail}`);
  }
};

export const sendEmailVerification = async (input: SendEmailInput) => {
  const sender = getSelectedStrategy(input.config);

  if (sender.type === "resend") {
    await sendResend(input, sender);
    return;
  }

  await sendConsole(input);
};
