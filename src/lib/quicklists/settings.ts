export const resolveQuicklistSortingInstructions = (
  settings: unknown
): string => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return "";
  }

  const instructions = (
    settings as Record<string, unknown>
  ).sortingInstructions;
  return typeof instructions === "string" ? instructions : "";
};
