export type ManagedUserFeatureFlag = Readonly<{
  key: string;
  title: string;
  description: string;
}>;

const MANAGED_USER_FEATURE_FLAGS: Readonly<
  Record<string, readonly ManagedUserFeatureFlag[]>
> = {
  lingocafe: [
    {
      key: "conversation",
      title: "Conversations",
      description:
        "Show the Conversations library in desktop and mobile navigation for this user.",
    },
  ],
};

export const getManagedUserFeatureFlags = (appId: string) =>
  MANAGED_USER_FEATURE_FLAGS[appId] || [];

export const parseFeatureFlagsEditorValue = (
  value: string
): Record<string, unknown> | null | undefined => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value || "null");
  } catch {
    return undefined;
  }

  if (parsed === null) return null;
  if (typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  return parsed as Record<string, unknown>;
};

export const isManagedUserFeatureEnabled = (
  value: string,
  key: string
) => parseFeatureFlagsEditorValue(value)?.[key] === true;

export const updateManagedUserFeatureFlag = ({
  value,
  key,
  enabled,
}: {
  value: string;
  key: string;
  enabled: boolean;
}) => {
  const current = parseFeatureFlagsEditorValue(value);
  if (current === undefined) {
    throw new Error("Feature flags must be valid JSON before using a switch.");
  }

  return JSON.stringify({ ...(current || {}), [key]: enabled }, null, 2);
};
