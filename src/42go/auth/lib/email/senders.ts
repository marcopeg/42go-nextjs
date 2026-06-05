import type { SendVerificationRequestParams } from "next-auth/providers/email";

import type {
  EmailProviderConfig,
  EmailStrategyConfig,
} from "@/42go/auth/lib/providers/types";

type SendEmailInput = SendVerificationRequestParams & {
  appId: string;
  config: EmailProviderConfig;
};

type EmailTemplateVars = {
  code: string;
  magicLink: string;
  url: string;
  expiresAt: string;
  expiry: string;
};

const getSelectedStrategy = (config: EmailProviderConfig): EmailStrategyConfig => {
  const key = config.useStrategy || "console";
  return config.strategies?.[key] || { type: "console" };
};

const renderEmailTemplate = (template: string, vars: EmailTemplateVars) =>
  template
    .replace(/\{\{\s*code\s*\}\}/g, vars.code)
    .replace(/\{\{\s*magicLink\s*\}\}/g, vars.magicLink)
    .replace(/\{\{\s*url\s*\}\}/g, vars.url)
    .replace(/\{\{\s*expiresAt\s*\}\}/g, vars.expiresAt)
    .replace(/\{\{\s*expiry\s*\}\}/g, vars.expiry);

const formatEmailSubject = (template: string | undefined, vars: EmailTemplateVars) =>
  renderEmailTemplate(template || "Your sign-in code", vars)
    .replace(/[\r\n]+/g, " ")
    .trim() || "Your sign-in code";

const buildEmailMessage = (input: SendEmailInput) => {
  const expiresAt = input.expires.toISOString();
  const vars = {
    code: input.token,
    magicLink: input.url,
    url: input.url,
    expiresAt,
    expiry: expiresAt,
  };

  return {
    from: input.config.from,
    to: input.identifier,
    subject: formatEmailSubject(input.config.subject, vars),
    text: renderEmailTemplate(
      typeof input.config.body === "string"
        ? input.config.body
        : input.config.body?.text || "",
      vars
    ),
    html:
      typeof input.config.body === "string"
        ? undefined
        : input.config.body?.html
        ? renderEmailTemplate(input.config.body.html, vars)
        : undefined,
  };
};

const sendConsole = async (input: SendEmailInput) => {
  const message = buildEmailMessage(input);
  console.info(
    [
      "[42go email auth] sign-in email",
      "",
      "FROM:",
      message.from || "",
      "",
      "TO:",
      message.to,
      "",
      "SUBJECT:",
      message.subject,
      "",
      "BODY:",
      message.text || message.html || "",
    ].join("\n")
  );
};

const sendResend = async (
  input: SendEmailInput,
  sender: Extract<EmailStrategyConfig, { type: "resend" }>
) => {
  const apiKey = sender.apiKey;
  if (!apiKey) {
    throw new Error("strategies.resend.apiKey is required for Resend delivery.");
  }

  const message = buildEmailMessage(input);
  if (!message.from) {
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
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
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
