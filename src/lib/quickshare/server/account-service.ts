import "server-only";

import { getDB } from "@/42go/db";
import {
  normalizeQuickShareHandle,
  quickShareHandleSchema,
} from "@/lib/quickshare/server/validation";

export type QuickSharePrincipal = { appId: string; userId: string };

export type QuickShareAccount = {
  id: string;
  appId: string;
  userId: string;
  handle: string;
  normalizedHandle: string;
};

export class QuickShareDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "QuickShareDomainError";
  }
}

const mapAccount = (row: {
  id: string;
  app_id: string;
  user_id: string;
  handle: string;
  normalized_handle: string;
}): QuickShareAccount => ({
  id: row.id,
  appId: row.app_id,
  userId: row.user_id,
  handle: row.handle,
  normalizedHandle: row.normalized_handle,
});

export const getQuickShareAccount = async (
  principal: QuickSharePrincipal,
): Promise<QuickShareAccount | null> => {
  const row = await getDB()("quickshare.accounts")
    .where({ app_id: principal.appId, user_id: principal.userId })
    .first();
  return row ? mapAccount(row) : null;
};

export const checkQuickShareHandleAvailability = async (
  appId: string,
  requestedHandle: string,
  exceptAccountId?: string,
) => {
  const normalizedHandle = normalizeQuickShareHandle(requestedHandle);
  const parsed = quickShareHandleSchema.safeParse(normalizedHandle);
  if (!parsed.success) {
    return { available: false, normalizedHandle, reason: parsed.error.issues[0]?.message ?? "Invalid handle" };
  }

  const query = getDB()("quickshare.accounts")
    .where({ app_id: appId, normalized_handle: normalizedHandle });
  if (exceptAccountId) query.whereNot("id", exceptAccountId);
  const existing = await query.first("id");
  return { available: !existing, normalizedHandle, reason: existing ? "This handle is already in use." : null };
};

export const claimQuickShareHandle = async (
  principal: QuickSharePrincipal,
  requestedHandle: string,
): Promise<QuickShareAccount> => {
  const availability = await checkQuickShareHandleAvailability(principal.appId, requestedHandle);
  if (!availability.available) {
    throw new QuickShareDomainError("handle_unavailable", availability.reason ?? "Handle unavailable", 409);
  }

  try {
    const rows = (await getDB().transaction(async (trx) => {
      const existing = await trx("quickshare.accounts")
        .where({ app_id: principal.appId, user_id: principal.userId })
        .first();
      if (existing) {
        if (existing.normalized_handle !== availability.normalizedHandle) {
          throw new QuickShareDomainError("account_already_onboarded", "Your QuickShare account already has a handle. Use the handle-change flow.", 409);
        }
        return [existing];
      }
      return trx("quickshare.accounts")
        .insert({
          app_id: principal.appId,
          user_id: principal.userId,
          handle: availability.normalizedHandle,
          normalized_handle: availability.normalizedHandle,
        })
        .returning(["id", "app_id", "user_id", "handle", "normalized_handle"]);
    })) as Array<{
      id: string;
      app_id: string;
      user_id: string;
      handle: string;
      normalized_handle: string;
    }>;
    return mapAccount(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new QuickShareDomainError("handle_unavailable", "This handle is already in use.", 409);
    }
    throw error;
  }
};

export const previewQuickShareHandleChange = async (
  principal: QuickSharePrincipal,
  requestedHandle: string,
) => {
  const account = await getQuickShareAccount(principal);
  if (!account) throw new QuickShareDomainError("account_missing", "Complete handle onboarding first.", 409);
  const availability = await checkQuickShareHandleAvailability(principal.appId, requestedHandle, account.id);
  const affected = await getDB()("quickshare.resources")
    .where({ app_id: principal.appId, account_id: account.id })
    .where((builder) => builder.whereNotNull("next_custom_id").orWhereNotNull("published_custom_id"))
    .count<{ count: string }[]>({ count: "*" });
  return { ...availability, currentHandle: account.handle, affectedCustomUrlCount: Number(affected[0]?.count ?? 0) };
};

export const changeQuickShareHandle = async (
  principal: QuickSharePrincipal,
  requestedHandle: string,
  confirmed: boolean,
  coordinator?: QuickShareHandleRenameCoordinator,
): Promise<QuickShareAccount> => {
  if (!confirmed) {
    throw new QuickShareDomainError("handle_change_confirmation_required", "Changing your handle changes every custom public URL. Confirm this disruptive operation.", 409);
  }
  const account = await getQuickShareAccount(principal);
  if (!account) throw new QuickShareDomainError("account_missing", "Complete handle onboarding first.", 409);
  const availability = await checkQuickShareHandleAvailability(principal.appId, requestedHandle, account.id);
  if (!availability.available) throw new QuickShareDomainError("handle_unavailable", availability.reason ?? "Handle unavailable", 409);
  const publishedCustomUrlCount = await getDB()("quickshare.resources")
    .where({ app_id: principal.appId, account_id: account.id, published_identifier_kind: "custom" })
    .count<{ count: string }[]>({ count: "*" });
  if (Number(publishedCustomUrlCount[0]?.count ?? 0) > 0 && !coordinator) {
    throw new QuickShareDomainError("delivery_rename_required", "This disruptive change has published custom URLs. The delivery folder must be renamed atomically before the handle is committed.", 409);
  }
  let deliveryRename: QuickShareDeliveryRename | undefined;
  if (coordinator) deliveryRename = await coordinator.rename({ appId: principal.appId, accountId: account.id, fromHandle: account.handle, toHandle: availability.normalizedHandle });
  try {
    const rows = await getDB()("quickshare.accounts")
      .where({ id: account.id, app_id: principal.appId, user_id: principal.userId })
      .update({ handle: availability.normalizedHandle, normalized_handle: availability.normalizedHandle, updated_at: getDB().fn.now() })
      .returning(["id", "app_id", "user_id", "handle", "normalized_handle"]);
    await deliveryRename?.finalize();
    return mapAccount(rows[0]);
  } catch (error) {
    await deliveryRename?.rollback().catch(() => undefined);
    if (isUniqueViolation(error)) throw new QuickShareDomainError("handle_unavailable", "This handle is already in use.", 409);
    throw error;
  }
};

/** Implemented by IF14 together with the atomic static-folder rename. */
export type QuickShareHandleRenameCoordinator = {
  rename: (input: { appId: string; accountId: string; fromHandle: string; toHandle: string }) => Promise<QuickShareDeliveryRename>;
};

export type QuickShareDeliveryRename = {
  finalize: () => Promise<void>;
  rollback: () => Promise<void>;
};

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
