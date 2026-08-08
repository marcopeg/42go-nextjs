import "server-only";

const DEFAULT_ASSETS_BASE_PATH = "https://assets.lingocafe.app";

export const getLingoCafeAssetsBasePath = () => {
  const basePath =
    process.env.LC_ASSETS_BASE_PATH?.trim() || DEFAULT_ASSETS_BASE_PATH;
  return basePath.replace(/\/+$/, "");
};

export const resolveLingoCafeAssetUrl = (assetKey: string | null | undefined) => {
  const normalized = assetKey?.trim().replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("\\") ||
    normalized.split("/").includes("..") ||
    /^[a-z][a-z0-9+.-]*:/i.test(normalized)
  ) {
    return null;
  }
  return `${getLingoCafeAssetsBasePath()}/${normalized}`;
};
