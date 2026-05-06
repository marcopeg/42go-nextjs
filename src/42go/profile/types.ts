import type { Knex } from "knex";
import type { ComponentType, ReactNode } from "react";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };

export type TProfileData = JsonObject;
export type TConsentData = Record<string, TConsentEvidenceEntry[]>;

export type TProfileValidationError = {
  path: string;
  message: string;
  keyword?: string;
};

export type TProfileValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: TProfileValidationError[] };

export type TProfileAjvConfig = {
  strict?: boolean;
};

export type TProfileSchemaConfig = Record<string, unknown>;

export type TProfileCoreConfig = {
  schema?: TProfileSchemaConfig;
  ajv?: TProfileAjvConfig;
};

export type TConsentCollectField = "source" | "method" | "ip" | "ua";

export type TConsentItem = {
  name: string;
  required?: boolean;
  version: string;
  label: string | ComponentType | ReactNode;
  collect?: readonly TConsentCollectField[];
};

export type TConsentConfig = {
  items?: readonly TConsentItem[];
};

export type TConsentEvidenceEntry = {
  value: boolean;
  changedAt: string;
  version: string;
  statement: string;
  source?: string;
  method?: string;
  ip?: string;
  ua?: string;
};

export type TProfileLoadResult = {
  profile: TProfileData | null;
  consent: TConsentData | null;
  account: {
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: string | null;
  } | null;
  isComplete: boolean;
};

export type TProfileSaveHooks = {
  onSaved?: (event: {
    userId: string;
    appId: string;
    before: TProfileLoadResult;
    after: TProfileLoadResult;
    db: Knex.Transaction;
  }) => Promise<void> | void;
};

export type TProfileContextConfig = TProfileCoreConfig & {
  consent?: TConsentConfig;
};
