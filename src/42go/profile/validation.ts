import Ajv, { type ErrorObject } from "ajv";

import type {
  JsonObject,
  TConsentConfig,
  TConsentData,
  TProfileContextConfig,
  TProfileData,
  TProfileValidationError,
  TProfileValidationResult,
} from "@/42go/profile/types";

export const isPlainJsonObject = (value: unknown): value is JsonObject =>
  !!value && typeof value === "object" && !Array.isArray(value);

const normalizeAjvError = (error: ErrorObject): TProfileValidationError => ({
  path: error.instancePath || "/",
  message: error.message || "Invalid profile data",
  keyword: error.keyword,
});

export const validateProfile = (
  profile: unknown,
  config?: TProfileContextConfig | null
): TProfileValidationResult => {
  if (!isPlainJsonObject(profile)) {
    return {
      ok: false,
      errors: [{ path: "/", message: "Profile must be a JSON object." }],
    };
  }

  if (!config?.schema) return { ok: true, errors: [] };

  const ajv = new Ajv({
    allErrors: true,
    strict: config.ajv?.strict ?? true,
  });
  const validate = ajv.compile(config.schema);

  if (validate(profile)) return { ok: true, errors: [] };

  return {
    ok: false,
    errors: (validate.errors || []).map(normalizeAjvError),
  };
};

export const getLatestConsentEvidence = (
  consent: TConsentData | null | undefined,
  name: string
) => {
  const entries = consent?.[name];
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries[entries.length - 1] || null;
};

export const isConsentItemComplete = (
  consent: TConsentData | null | undefined,
  item: NonNullable<TConsentConfig["items"]>[number]
) => {
  const latest = getLatestConsentEvidence(consent, item.name);

  return (
    !!latest &&
    latest.value === true &&
    latest.version === item.version &&
    latest.statement === item.statement
  );
};

export const isProfileComplete = ({
  profile,
  consent,
  config,
}: {
  profile: TProfileData | null;
  consent: TConsentData | null;
  config?: TProfileContextConfig | null;
}) => {
  if (profile === null && config?.schema) return false;

  if (profile !== null) {
    const result = validateProfile(profile, config);
    if (!result.ok) return false;
  }

  const requiredConsent = config?.consent?.items?.filter(
    (item) => item.required
  );

  if (requiredConsent?.length) {
    return requiredConsent.every((item) => isConsentItemComplete(consent, item));
  }

  return true;
};
