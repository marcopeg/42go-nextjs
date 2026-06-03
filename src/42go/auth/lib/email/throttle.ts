import { getDB } from "@/42go/db";
import type { EmailProviderConfig } from "@/42go/auth/lib/providers/types";
import { parseEmailDurationSeconds } from "@/42go/auth/lib/email/duration";
import { DEFAULT_EMAIL_THROTTLE_DELAY } from "@/42go/auth/lib/email/config";

const chooseDelaySeconds = (
  attemptCount: number,
  config?: EmailProviderConfig["throttle"]
) => {
  const delays = config?.delay?.length ? config.delay : DEFAULT_EMAIL_THROTTLE_DELAY;
  const delay = delays[Math.min(attemptCount, delays.length - 1)] || "10m";
  return parseEmailDurationSeconds(
    delay,
    `auth.providers[].config.throttle.delay[${Math.min(
      attemptCount,
      delays.length - 1
    )}]`
  );
};

export const consumeEmailThrottle = async ({
  appId,
  identifier,
  config,
}: {
  appId: string;
  identifier: string;
  config?: EmailProviderConfig["throttle"];
}) => {
  const db = getDB();
  const now = new Date();
  const current = await db("auth.email_auth_throttle")
    .where({ app_id: appId, identifier })
    .first();

  if (current && new Date(current.next_allowed_at).getTime() > now.getTime()) {
    return {
      allowed: false,
      message: config?.message || "Wait before requesting another sign-in email.",
      retryAt: new Date(current.next_allowed_at),
    };
  }

  const attemptCount = current ? Number(current.attempt_count || 0) + 1 : 1;
  const cooldownSeconds = chooseDelaySeconds(attemptCount - 1, config);
  const nextAllowedAt = new Date(now.getTime() + cooldownSeconds * 1000);

  await db("auth.email_auth_throttle")
    .insert({
      app_id: appId,
      identifier,
      attempt_count: attemptCount,
      last_attempt_at: now,
      next_allowed_at: nextAllowedAt,
      meta: {},
      created_at: now,
      updated_at: now,
    })
    .onConflict(["app_id", "identifier"])
    .merge({
      attempt_count: attemptCount,
      last_attempt_at: now,
      next_allowed_at: nextAllowedAt,
      updated_at: now,
    });

  return {
    allowed: true,
    message: null,
    retryAt: nextAllowedAt,
  };
};
