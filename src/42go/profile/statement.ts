import type { TConsentItem } from "@/42go/profile/types";

export const getConsentPlainLabel = (label: string): string =>
  label
    .replace(/\[([^\]\n]+)\]\([^) \n]+\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1");

export const getConsentStatement = (item: TConsentItem): string =>
  typeof item.label === "string" ? getConsentPlainLabel(item.label) : item.name;
