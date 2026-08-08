import "server-only";

const DEFAULT_ASSETS_BASE_PATH = "https://assets.lingocafe.app";

const normalizeAssetKey = (assetKey: string | null | undefined) => {
  const normalized = assetKey?.trim().replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\\") ||
    normalized.split("/").includes("..") ||
    /^[a-z][a-z0-9+.-]*:/i.test(normalized)
  ) {
    return null;
  }
  return normalized;
};

export const getLingoCafeAssetsBasePath = () => {
  const basePath =
    process.env.LC_ASSETS_BASE_PATH?.trim() || DEFAULT_ASSETS_BASE_PATH;
  return basePath.replace(/\/+$/, "");
};

export const resolveLingoCafeAssetUrl = (assetKey: string | null | undefined) => {
  const normalized = normalizeAssetKey(assetKey);
  if (!normalized) return null;
  return `${getLingoCafeAssetsBasePath()}/${normalized}`;
};

/**
 * Temporary same-origin persona mirror. Set LC_PERSONA_ASSETS_BASE_PATH to
 * switch these URLs to the immutable assets distribution without changing
 * database keys or the conversation payload.
 */
export const resolveLingoCafePersonaAvatarUrl = (
  assetKey: string | null | undefined
) => {
  const normalized = normalizeAssetKey(assetKey);
  if (!normalized) return null;
  const configuredBasePath =
    process.env.LC_PERSONA_ASSETS_BASE_PATH?.trim().replace(/\/+$/, "");
  return configuredBasePath
    ? `${configuredBasePath}/${normalized}`
    : `/${normalized}`;
};
