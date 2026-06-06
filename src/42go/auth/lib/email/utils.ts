import { randomInt } from "crypto";

import type { EmailCodeGenerationConfig } from "@/42go/auth/lib/providers/types";
import { DEFAULT_EMAIL_CODE_CONFIG } from "@/42go/auth/lib/email/config";
import { normalizeAuthEmail } from "@/42go/auth/lib/email/validation";

const CODE_ALPHABETS = {
  digits: "0123456789",
  alphabet: "abcdefghijklmnopqrstuvwxyz",
  alphanumeric: "abcdefghijklmnopqrstuvwxyz0123456789",
  complex: "abcdefghijklmnopqrstuvwxyz0123456789!#$%*+-=?@^_",
} satisfies Record<Required<EmailCodeGenerationConfig>["mode"], string>;

export const normalizeEmailIdentifier = (identifier: string) => {
  return normalizeAuthEmail(identifier);
};

export const usernameFromEmail = (email: string) => {
  const localPart = email.split("@")[0]?.trim();
  return localPart || email;
};

export const generateEmailCode = (config?: EmailCodeGenerationConfig) => {
  const resolved = {
    ...DEFAULT_EMAIL_CODE_CONFIG,
    ...(config || {}),
  };
  const length = Math.max(1, Math.min(64, Math.floor(resolved.length)));
  let alphabet = CODE_ALPHABETS[resolved.mode] || CODE_ALPHABETS.digits;

  if (resolved.caseSensitive && resolved.mode !== "digits") {
    alphabet = `${alphabet}${alphabet.toUpperCase()}`;
  }

  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += alphabet[randomInt(0, alphabet.length)];
  }

  return resolved.caseSensitive ? code : code.toLowerCase();
};

export const normalizeEmailCode = (
  code: string,
  config?: EmailCodeGenerationConfig
) => {
  const trimmed = code.trim();
  return config?.caseSensitive ? trimmed : trimmed.toLowerCase();
};
