import type {
  TPWAInstallIcons,
  TPWAResolvedInstallTarget,
} from "@/42go/pwa/types";

const INTERNAL_ORIGIN = "https://42go.invalid";

const normalizeRootRelativeURL = ({
  field,
  value,
  allowSearch = false,
}: {
  field: string;
  value: string;
  allowSearch?: boolean;
}) => {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    throw new Error(`${field} must be a same-origin root-relative URL`);
  }

  const parsed = new URL(value, INTERNAL_ORIGIN);
  if (parsed.origin !== INTERNAL_ORIGIN || parsed.hash) {
    throw new Error(`${field} must not change origin or include a fragment`);
  }
  if (!allowSearch && parsed.search) {
    throw new Error(`${field} must not include query parameters`);
  }

  return `${parsed.pathname}${allowSearch ? parsed.search : ""}`;
};

const normalizeName = (value: string, field: string, maxLength: number) => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error(`${field} must not be empty`);
  return normalized.slice(0, maxLength);
};

const isWithinScope = (startUrl: string, scope: string) => {
  const startPath = new URL(startUrl, INTERNAL_ORIGIN).pathname;
  const scopePath = new URL(scope, INTERNAL_ORIGIN).pathname;
  if (scopePath === "/") return true;

  const prefix = scopePath.endsWith("/") ? scopePath : `${scopePath}/`;
  return startPath === scopePath || startPath.startsWith(prefix);
};

export const normalizePWAInstallIcons = (
  icons: TPWAInstallIcons
): TPWAInstallIcons => ({
  faviconIco: normalizeRootRelativeURL({
    field: "icons.faviconIco",
    value: icons.faviconIco,
  }),
  favicon16: normalizeRootRelativeURL({
    field: "icons.favicon16",
    value: icons.favicon16,
  }),
  favicon32: normalizeRootRelativeURL({
    field: "icons.favicon32",
    value: icons.favicon32,
  }),
  appleTouch180: normalizeRootRelativeURL({
    field: "icons.appleTouch180",
    value: icons.appleTouch180,
  }),
  manifest192: normalizeRootRelativeURL({
    field: "icons.manifest192",
    value: icons.manifest192,
  }),
  manifest512: normalizeRootRelativeURL({
    field: "icons.manifest512",
    value: icons.manifest512,
  }),
  maskable512: normalizeRootRelativeURL({
    field: "icons.maskable512",
    value: icons.maskable512,
  }),
});

export const validatePWAInstallTarget = (
  target: TPWAResolvedInstallTarget
): TPWAResolvedInstallTarget => {
  const id = normalizeRootRelativeURL({ field: "id", value: target.id });
  const startUrl = normalizeRootRelativeURL({
    field: "startUrl",
    value: target.startUrl,
    allowSearch: true,
  });
  const scope = normalizeRootRelativeURL({
    field: "scope",
    value: target.scope,
  });
  const manifestPath = target.manifestPath
    ? normalizeRootRelativeURL({
        field: "manifestPath",
        value: target.manifestPath,
      })
    : null;

  if (!isWithinScope(startUrl, scope)) {
    throw new Error(`startUrl "${startUrl}" is outside scope "${scope}"`);
  }

  return {
    ...target,
    id,
    name: normalizeName(target.name, "name", 120),
    shortName: normalizeName(target.shortName, "shortName", 40),
    startUrl,
    scope,
    manifestPath,
    icons: normalizePWAInstallIcons(target.icons),
  };
};
