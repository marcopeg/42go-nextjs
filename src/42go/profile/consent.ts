import type {
  TConsentConfig,
  TConsentData,
  TConsentEvidenceEntry,
} from "@/42go/profile/types";
import { getLatestConsentEvidence } from "@/42go/profile/validation";

type BuildConsentPatchInput = {
  current: TConsentData | null;
  values: Record<string, boolean>;
  config?: TConsentConfig | null;
  evidence?: {
    source?: string;
    method?: string;
    ip?: string;
    ua?: string;
  };
  changedAt?: string;
};

export const normalizeConsentData = (value: unknown): TConsentData | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const consent: TConsentData = {};

  for (const [key, entries] of Object.entries(value)) {
    if (!Array.isArray(entries)) continue;
    const normalized = entries.filter(
      (entry): entry is TConsentEvidenceEntry =>
        !!entry &&
        typeof entry === "object" &&
        !Array.isArray(entry) &&
        typeof (entry as TConsentEvidenceEntry).value === "boolean" &&
        typeof (entry as TConsentEvidenceEntry).changedAt === "string" &&
        typeof (entry as TConsentEvidenceEntry).version === "string" &&
        typeof (entry as TConsentEvidenceEntry).statement === "string"
    );

    if (normalized.length > 0) consent[key] = normalized;
  }

  return Object.keys(consent).length > 0 ? consent : null;
};

export const buildConsentPatch = ({
  current,
  values,
  config,
  evidence,
  changedAt = new Date().toISOString(),
}: BuildConsentPatchInput): TConsentData => {
  const itemByName = new Map(
    (config?.items || []).map((item) => [item.name, item])
  );
  const next: TConsentData = { ...(current || {}) };

  for (const [name, value] of Object.entries(values)) {
    const item = itemByName.get(name);
    if (!item) continue;

    const entries = Array.isArray(next[name]) ? [...next[name]] : [];
    const latest = entries[entries.length - 1];
    const shouldAppend =
      !latest ||
      latest.value !== value ||
      latest.version !== item.version ||
      latest.statement !== item.statement;

    if (!shouldAppend) continue;

    const entry: TConsentEvidenceEntry = {
      value,
      changedAt,
      version: item.version,
      statement: item.statement,
    };

    for (const field of item.collect || []) {
      const fieldValue = evidence?.[field];
      if (fieldValue) entry[field] = fieldValue;
    }

    next[name] = [...entries, entry];
  }

  return next;
};

export const getConsentCurrentValues = (
  consent: TConsentData | null | undefined,
  config?: TConsentConfig | null
) =>
  Object.fromEntries(
    (config?.items || []).map((item) => {
      const latest = getLatestConsentEvidence(consent, item.name);
      const isCurrent =
        !!latest &&
        latest.version === item.version &&
        latest.statement === item.statement;

      return [item.name, isCurrent ? latest.value : false];
    })
  );
