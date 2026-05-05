export const LINGOCAFE_LEGAL_LINKS = {
  terms: "/terms",
  privacy: "/privacy",
} as const;

export const LINGOCAFE_CONSENT_METHOD = "checkbox-submit" as const;

export const LINGOCAFE_CONSENT_VERSIONS = {
  terms: "terms-2026-05-04",
  privacy: "privacy-2026-05-04",
  mkt: "mkt-2026-05-04",
  alpha: "alpha-2026-05-04",
} as const;

export const LINGOCAFE_CONSENT_LABELS = {
  terms: "I accept the Terms and Conditions",
  privacy: "I acknowledge the Privacy Policy",
  mkt: "I consent to receive content updates and offers about LingoCafe services",
  alpha:
    "I want to participate in the Early Birds program and receive all the features for free",
} as const;

export const consentKeys = ["terms", "privacy", "mkt", "alpha"] as const;
export type LingoCafeConsentKey = (typeof consentKeys)[number];

export const consentSources = ["profile", "books-onboarding"] as const;
export type LingoCafeConsentSource = (typeof consentSources)[number];

export type LingoCafeConsentValues = Partial<
  Record<LingoCafeConsentKey, boolean>
>;

export type LingoCafeConsentRecord = {
  value: boolean;
  date: string;
  version: string;
  source: LingoCafeConsentSource;
  method: typeof LINGOCAFE_CONSENT_METHOD;
};

export type LingoCafeConsentObjectKey = `consent_${LingoCafeConsentKey}`;

export type LingoCafeConsentData = Partial<
  Record<LingoCafeConsentObjectKey, LingoCafeConsentRecord>
>;

export type LingoCafeConsentPatch = {
  values: LingoCafeConsentValues;
  source: LingoCafeConsentSource;
  nowISO: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const normalizeConsentData = (
  data: unknown
): LingoCafeConsentData & Record<string, unknown> =>
  isRecord(data) ? { ...data } : {};

export const consentObjectKey = (key: LingoCafeConsentKey) =>
  `consent_${key}` as const;

const legacyConsentField = <
  TParam extends "value" | "date" | "version" | "source" | "method",
>(
  key: LingoCafeConsentKey,
  param: TParam
) => `consent_${key}_${param}` as const;

const isConsentSource = (value: unknown): value is LingoCafeConsentSource =>
  consentSources.includes(value as LingoCafeConsentSource);

const isConsentRecord = (value: unknown): value is LingoCafeConsentRecord =>
  isRecord(value) &&
  typeof value.value === "boolean" &&
  typeof value.date === "string" &&
  typeof value.version === "string" &&
  isConsentSource(value.source) &&
  value.method === LINGOCAFE_CONSENT_METHOD;

const getConsentRecord = (
  data: unknown,
  key: LingoCafeConsentKey
): LingoCafeConsentRecord | null => {
  const normalized = normalizeConsentData(data);
  const nestedRecord = normalized[consentObjectKey(key)];

  if (isConsentRecord(nestedRecord)) return nestedRecord;

  const legacyValue = normalized[legacyConsentField(key, "value")];
  if (typeof legacyValue !== "boolean") return null;

  const legacyDate = normalized[legacyConsentField(key, "date")];
  const legacyVersion = normalized[legacyConsentField(key, "version")];
  const legacySource = normalized[legacyConsentField(key, "source")];

  return {
    value: legacyValue,
    date: typeof legacyDate === "string" ? legacyDate : "",
    version: typeof legacyVersion === "string" ? legacyVersion : "",
    source: isConsentSource(legacySource) ? legacySource : "profile",
    method: LINGOCAFE_CONSENT_METHOD,
  };
};

export const getConsentBoolean = (
  data: unknown,
  key: LingoCafeConsentKey
) => getConsentRecord(data, key)?.value === true;

export const stripLegacyConsentFields = (data: unknown) => {
  const next = normalizeConsentData(data);

  for (const key of consentKeys) {
    delete next[legacyConsentField(key, "value")];
    delete next[legacyConsentField(key, "date")];
    delete next[legacyConsentField(key, "version")];
    delete next[legacyConsentField(key, "source")];
    delete next[legacyConsentField(key, "method")];
  }

  return next;
};

export const buildConsentDataPatch = ({
  currentData,
  values,
  source,
  nowISO,
}: LingoCafeConsentPatch & {
  currentData: unknown;
}): Record<string, unknown> => {
  const current = normalizeConsentData(currentData);
  const patch: Record<string, unknown> = {};

  for (const key of consentKeys) {
    if (!(key in values)) continue;

    const nextValue = values[key] === true;
    const currentRecord = getConsentRecord(current, key);
    const recordKey = consentObjectKey(key);
    const nextVersion = LINGOCAFE_CONSENT_VERSIONS[key];
    const shouldRefreshEvidence =
      currentRecord?.value !== nextValue ||
      currentRecord?.version !== nextVersion ||
      !currentRecord?.date;

    patch[recordKey] = {
      value: nextValue,
      date: shouldRefreshEvidence ? nowISO : currentRecord?.date ?? nowISO,
      version: nextVersion,
      source,
      method: LINGOCAFE_CONSENT_METHOD,
    } satisfies LingoCafeConsentRecord;
  }

  return patch;
};
