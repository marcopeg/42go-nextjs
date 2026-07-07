import "server-only";

import { getDB } from "@/42go/db";
import { recordEvent } from "@/42go/events/server";
import { getAccountErasureHandlers } from "./registry.server";
import {
  AccountErasureError,
  type AccountErasureTargetUser,
  type RunAccountErasureInput,
  type RunAccountErasureResult,
} from "./types";

type UserLookupRow = {
  id: string;
  app_id: string;
  email: string;
};

const mapTargetUser = (row: UserLookupRow): AccountErasureTargetUser => ({
  id: row.id,
  appId: row.app_id,
  email: row.email,
});

export const runAccountErasure = async ({
  appId,
  targetUserId,
  actorUserId,
  confirmationEmail,
}: RunAccountErasureInput): Promise<RunAccountErasureResult> => {
  const normalizedTargetUserId = targetUserId.trim();
  const normalizedActorUserId = actorUserId.trim();

  if (!appId) {
    throw new AccountErasureError(
      "app_not_found",
      "Unable to resolve app context.",
      404
    );
  }

  if (!normalizedTargetUserId || !normalizedActorUserId) {
    throw new AccountErasureError(
      "invalid_request",
      "Invalid account erasure request."
    );
  }

  if (normalizedTargetUserId === normalizedActorUserId) {
    throw new AccountErasureError(
      "self_delete_forbidden",
      "You cannot delete your own account.",
      403
    );
  }

  const db = getDB();

  return db.transaction(async (trx) => {
    const actorRow = await trx("auth.users")
      .select("id")
      .where({ app_id: appId, id: normalizedActorUserId })
      .first();

    if (!actorRow) {
      throw new AccountErasureError(
        "actor_not_found",
        "Acting user not found.",
        403
      );
    }

    const targetRow = (await trx("auth.users")
      .select("id", "app_id", "email")
      .where({ app_id: appId, id: normalizedTargetUserId })
      .first()) as UserLookupRow | undefined;

    if (!targetRow) {
      throw new AccountErasureError(
        "user_not_found",
        "User not found.",
        404
      );
    }

    if (confirmationEmail !== targetRow.email) {
      throw new AccountErasureError(
        "invalid_confirmation",
        "Confirmation email does not match the target user."
      );
    }

    const targetUser = mapTargetUser(targetRow);
    const handlers = getAccountErasureHandlers(appId);
    const handlerResults = [];

    for (const handler of handlers) {
      handlerResults.push(
        await handler.erase({
          appId,
          targetUser,
          actor: { id: normalizedActorUserId },
          trx,
        })
      );
    }

    await trx("auth.verification_tokens")
      .where({ app_id: appId, identifier: targetUser.email })
      .delete();

    await trx("auth.email_auth_throttle")
      .where({ app_id: appId, identifier: targetUser.email })
      .delete();

    await trx("auth.users")
      .where({ app_id: appId, id: targetUser.id })
      .delete();

    await recordEvent({
      db: trx,
      appId,
      userId: normalizedActorUserId,
      name: "user.deleted",
      data: {
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        handlers: handlerResults.map((result) => ({
          id: result.id,
          deleted: result.deleted || {},
          skipped: Boolean(result.skipped),
        })),
      },
    });

    return {
      ok: true,
      targetUserId: targetUser.id,
      targetEmail: targetUser.email,
      handlers: handlerResults,
    };
  });
};
