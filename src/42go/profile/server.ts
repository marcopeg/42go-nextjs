import "server-only";

import type { Knex } from "knex";

import { getDB } from "@/42go/db";
import { normalizeConsentData } from "@/42go/profile/consent";
import type {
  TConsentData,
  TProfileContextConfig,
  TProfileData,
  TProfileLoadResult,
  TProfileSaveHooks,
} from "@/42go/profile/types";
import {
  isPlainJsonObject,
  isProfileComplete,
  validateProfile,
} from "@/42go/profile/validation";

type UserProfileRow = {
  profile: unknown;
  consent: unknown;
  name: string | null;
  email: string | null;
  image: string | null;
  created_at: Date | string | null;
};

type ProfileHelperInput = {
  userId: string;
  appId: string;
  config?: TProfileContextConfig | null;
  db?: Knex;
};

type SaveProfileInput = ProfileHelperInput & {
  profile: TProfileData;
  consent?: TConsentData | null;
  account?: {
    name?: string | null;
    image?: string | null;
  };
  hooks?: TProfileSaveHooks;
};

type SetProfileKeysInput = ProfileHelperInput & {
  values: Record<string, unknown>;
  hooks?: TProfileSaveHooks;
};

const normalizeProfileData = (value: unknown): TProfileData | null =>
  isPlainJsonObject(value) ? (value as TProfileData) : null;

const loadRawUserProfile = async (db: Knex, userId: string) =>
  (await db("auth.users")
    .select("profile", "consent", "name", "email", "image", "created_at")
    .where({ id: userId })
    .first()) as UserProfileRow | undefined;

const toISO = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
};

const toLoadResult = (
  row: UserProfileRow | undefined,
  config?: TProfileContextConfig | null
): TProfileLoadResult => {
  const profile = normalizeProfileData(row?.profile);
  const consent = normalizeConsentData(row?.consent);

  return {
    profile,
    consent,
    account: row
      ? {
          name: row.name ?? null,
          email: row.email ?? null,
          image: row.image ?? null,
          createdAt: toISO(row.created_at),
        }
      : null,
    isComplete: isProfileComplete({ profile, consent, config }),
  };
};

export const loadProfile = async ({
  userId,
  config,
  db = getDB(),
}: ProfileHelperInput): Promise<TProfileLoadResult> =>
  toLoadResult(await loadRawUserProfile(db, userId), config);

export const validateProfileData = validateProfile;

export const saveProfile = async ({
  userId,
  appId,
  profile,
  consent,
  account,
  config,
  hooks,
  db = getDB(),
}: SaveProfileInput): Promise<TProfileLoadResult> => {
  const validation = validateProfile(profile, config);
  if (!validation.ok) {
    const message = validation.errors.map((error) => error.message).join("; ");
    throw new Error(message || "Invalid profile data.");
  }

  return db.transaction(async (trx) => {
    const before = toLoadResult(await loadRawUserProfile(trx, userId), config);
    const updateValues: Record<string, unknown> = {
      profile,
      consent: consent ?? before.consent,
      updated_at: trx.fn.now(),
    };

    if (account && "name" in account) {
      updateValues.name = account.name ?? null;
    }

    if (account && "image" in account) {
      updateValues.image = account.image ?? null;
    }

    await trx("auth.users").where({ id: userId }).update(updateValues);

    const after = toLoadResult(await loadRawUserProfile(trx, userId), config);
    await hooks?.onSaved?.({ userId, appId, before, after, db: trx });

    return after;
  });
};

export const getProfileKeys = async ({
  userId,
  config,
  db = getDB(),
  keys,
}: ProfileHelperInput & { keys: string[] }) => {
  const loaded = await loadProfile({ userId, appId: "", config, db });
  const source = loaded.profile || {};

  return Object.fromEntries(keys.map((key) => [key, source[key]]));
};

export const setProfileKeys = async ({
  userId,
  appId,
  config,
  values,
  hooks,
  db = getDB(),
}: SetProfileKeysInput): Promise<TProfileLoadResult> => {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      throw new Error(`Profile value for "${key}" cannot be undefined.`);
    }
  }

  const current = await loadProfile({ userId, appId, config, db });
  const nextProfile = {
    ...(current.profile || {}),
    ...(values as TProfileData),
  };

  return saveProfile({
    userId,
    appId,
    profile: nextProfile,
    consent: current.consent,
    config,
    hooks,
    db,
  });
};

export const setProfileKey = async (
  input: Omit<SetProfileKeysInput, "values"> & { key: string; value: unknown }
) =>
  setProfileKeys({
    ...input,
    values: { [input.key]: input.value },
  });
