import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const themeRoot = join(process.cwd(), "public", "app-themes");
const registryPath = join(
  process.cwd(),
  "src",
  "42go",
  "app-themes",
  "app-themes.registry.ts",
);

const stylesheetFilename = "style.css";

const getThemeFolders = () => {
  if (!existsSync(themeRoot)) return [];

  return readdirSync(themeRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(themeRoot, entry.name, stylesheetFilename)),
    )
    .map((entry) => entry.name)
    .sort();
};

const formatRegistry = (themeFolders) => {
  const lines = [
    "export const APP_THEME_STYLESHEET_REGISTRY = {",
  ];

  for (const appId of themeFolders) {
    lines.push(`  ${JSON.stringify(appId)}: true,`);
  }

  lines.push("} as const satisfies Record<string, true>;", "");

  return lines.join("\n");
};

const themeFolders = getThemeFolders();

if (!themeFolders.includes("_default")) {
  throw new Error(
    `Missing required default app theme stylesheet: _default/${stylesheetFilename}`,
  );
}

writeFileSync(registryPath, formatRegistry(themeFolders));
