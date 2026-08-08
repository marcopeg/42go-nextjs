import type { TAppLayoutNavItem } from "./types";

export const filterUserFeatureFlaggedMenuItems = (
  items: readonly TAppLayoutNavItem[],
  featureFlags: Readonly<Record<string, unknown>> | null
) =>
  items.filter(
    (item) =>
      !item.userFeatureFlag || featureFlags?.[item.userFeatureFlag] === true
  );
