import type { EmailDuration } from "@/42go/auth/lib/providers/types";

const EMAIL_DURATION_PATTERN = /^([1-9]\d*)([smh])$/;

export const parseEmailDurationSeconds = (
  value: EmailDuration,
  configPath: string
) => {
  const input = String(value).trim();
  const match = EMAIL_DURATION_PATTERN.exec(input);

  if (!match) {
    throw new Error(
      `${configPath} must be a duration string like "30s", "5m", or "1h". Plain numbers such as "4" are not valid.`
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit === "s") return amount;
  if (unit === "m") return amount * 60;
  return amount * 60 * 60;
};
