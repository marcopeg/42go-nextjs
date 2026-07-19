export const QUICKLIST_MODES = ["todo", "checklist"] as const;

export type QuicklistMode = (typeof QUICKLIST_MODES)[number];

export const DEFAULT_QUICKLIST_MODE: QuicklistMode = "todo";

export const isQuicklistMode = (value: unknown): value is QuicklistMode =>
  typeof value === "string" && QUICKLIST_MODES.includes(value as QuicklistMode);

export const resolveQuicklistMode = (settings: unknown): QuicklistMode => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return DEFAULT_QUICKLIST_MODE;
  }

  const mode = (settings as Record<string, unknown>).mode;
  return isQuicklistMode(mode) ? mode : DEFAULT_QUICKLIST_MODE;
};
