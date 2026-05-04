import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const iconRoot = join(process.cwd(), "public", "app-icons");
const registryPath = join(
  process.cwd(),
  "src",
  "42go",
  "icons",
  "app-icons.registry.ts",
);

const iconAssets = {
  faviconIco: "favicon.ico",
  favicon16: "favicon-16x16.png",
  favicon32: "favicon-32x32.png",
  appleTouch180: "apple-touch-icon-180x180.png",
  manifest192: "manifest-192x192.png",
  manifest512: "manifest-512x512.png",
  maskable512: "maskable-512x512.png",
  ui: "ui.png",
};

const readAppIds = () => {
  const appConfigPath = join(process.cwd(), "src", "AppConfig.ts");
  const source = existsSync(appConfigPath)
    ? readFileSync(appConfigPath, "utf8")
    : "";
  const match = source.match(/export const apps = \{([\s\S]*?)\} as const/s);
  if (!match) return [];

  return Array.from(match[1].matchAll(/^\s*([A-Za-z0-9_]+):/gm)).map(
    ([, appId]) => appId,
  );
};

const readStrictAppIds = (appIds) =>
  appIds.filter((appId) => {
    const configPath = join(process.cwd(), "src", "config", appId, "config.ts");
    if (!existsSync(configPath)) return false;

    const source = readFileSync(configPath, "utf8");
    return /icons\s*:\s*\{[\s\S]*?strict\s*:\s*true/.test(source);
  });

const getFolders = () => {
  if (!existsSync(iconRoot)) return [];

  return readdirSync(iconRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

const getFolderAssets = (folder) => {
  const folderPath = join(iconRoot, folder);
  const result = {};

  for (const [assetKey, filename] of Object.entries(iconAssets)) {
    if (existsSync(join(folderPath, filename))) {
      result[assetKey] = true;
    }
  }

  return result;
};

const getMissingAssets = (assets) =>
  Object.keys(iconAssets).filter((assetKey) => !assets[assetKey]);

const formatRegistry = (registry) => {
  const lines = [
    'import type { TAppIconAssetKey } from "@/42go/icons/types";',
    "",
    "export const APP_ICON_REGISTRY = {",
  ];

  for (const [folder, assets] of Object.entries(registry)) {
    lines.push(`  ${JSON.stringify(folder)}: {`);
    for (const assetKey of Object.keys(iconAssets)) {
      if (assets[assetKey]) {
        lines.push(`    ${assetKey}: true,`);
      }
    }
    lines.push("  },");
  }

  lines.push(
    "} as const satisfies Record<string, Partial<Record<TAppIconAssetKey, true>>>;",
    "",
  );

  return `${lines.join("\n")}`;
};

const appIds = readAppIds();
const strictAppIds = readStrictAppIds(appIds);
const strictAll = process.env.APP_ICONS_STRICT === "1";
const folders = getFolders();
const registry = Object.fromEntries(
  folders.map((folder) => [folder, getFolderAssets(folder)]),
);

const defaultAssets = registry._default ?? {};
const missingDefaultAssets = getMissingAssets(defaultAssets);

if (missingDefaultAssets.length > 0) {
  throw new Error(
    `Missing required default app icon assets: ${missingDefaultAssets
      .map((assetKey) => iconAssets[assetKey])
      .join(", ")}`,
  );
}

for (const appId of appIds) {
  const hasAppFolder = Boolean(registry[appId]);
  const appAssets = registry[appId] ?? {};
  const missingAssets = getMissingAssets(appAssets);

  if (missingAssets.length === 0) continue;

  const message = `App iconset "${appId}" is missing: ${missingAssets
    .map((assetKey) => iconAssets[assetKey])
    .join(", ")}`;

  if (strictAll || strictAppIds.includes(appId)) {
    throw new Error(message);
  }

  if (hasAppFolder) {
    console.warn(`[app-icons] ${message}. Missing assets will use _default.`);
  }
}

writeFileSync(registryPath, formatRegistry(registry));
