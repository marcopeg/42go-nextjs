const PARAM_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const decodeSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

const splitPath = (value: string) =>
  value === "/" ? [] : value.replace(/^\/+|\/+$/g, "").split("/");

const getParameterNames = (pattern: string) =>
  splitPath(pattern)
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));

const getPatternSignature = (pattern: string) =>
  splitPath(pattern)
    .map((segment) => (segment.startsWith(":") ? ":param" : segment))
    .join("/");

export const validatePWAPathPattern = (pattern: string) => {
  if (!pattern.startsWith("/") || pattern.startsWith("//")) {
    throw new Error(`PWA target pattern must be root-relative: ${pattern}`);
  }
  if (pattern.includes("?") || pattern.includes("#") || pattern.includes("\\")) {
    throw new Error(`PWA target pattern must contain only a pathname: ${pattern}`);
  }

  const segments = splitPath(pattern);
  const names = new Set<string>();

  segments.forEach((segment, index) => {
    if (segment === "**") {
      if (index !== segments.length - 1) {
        throw new Error(`PWA target wildcard must be the final segment: ${pattern}`);
      }
      return;
    }

    if (!segment.startsWith(":")) return;

    const name = segment.slice(1);
    if (!PARAM_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid PWA target parameter in pattern: ${pattern}`);
    }
    if (names.has(name)) {
      throw new Error(`Duplicate PWA target parameter "${name}": ${pattern}`);
    }
    names.add(name);
  });

  return pattern;
};

export const validatePWAManifestPathTemplate = ({
  pattern,
  template,
}: {
  pattern: string;
  template: string;
}) => {
  validatePWAPathPattern(pattern);
  if (
    !template.startsWith("/") ||
    template.startsWith("//") ||
    template.includes("?") ||
    template.includes("#") ||
    template.includes("\\") ||
    template.includes("**")
  ) {
    throw new Error(`Invalid PWA manifest path template: ${template}`);
  }

  const patternParameters = new Set(getParameterNames(pattern));
  for (const parameter of getParameterNames(template)) {
    if (!patternParameters.has(parameter)) {
      throw new Error(
        `Manifest path parameter "${parameter}" is not declared by ${pattern}`
      );
    }
  }

  return template;
};

export const validatePWAInstallTargetDeclarations = (
  declarations: readonly {
    pattern: string;
    resolver: string;
    manifestPath?: string;
  }[]
) => {
  const signatures = new Set<string>();

  declarations.forEach((declaration) => {
    validatePWAPathPattern(declaration.pattern);
    if (!declaration.resolver.trim()) {
      throw new Error(
        `PWA target resolver must not be empty: ${declaration.pattern}`
      );
    }
    if (declaration.manifestPath) {
      validatePWAManifestPathTemplate({
        pattern: declaration.pattern,
        template: declaration.manifestPath,
      });
    }

    const signature = getPatternSignature(declaration.pattern);
    if (signatures.has(signature)) {
      throw new Error(`Ambiguous PWA target pattern: ${declaration.pattern}`);
    }
    signatures.add(signature);
  });

  return declarations;
};

export const matchPWAPathPattern = (
  pattern: string,
  pathname: string
): Record<string, string> | null => {
  validatePWAPathPattern(pattern);

  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;

  const patternSegments = splitPath(pattern);
  const pathSegments = splitPath(pathname);
  const hasWildcard = patternSegments.at(-1) === "**";
  const fixedSegments = hasWildcard
    ? patternSegments.slice(0, -1)
    : patternSegments;

  if (
    pathSegments.length < fixedSegments.length ||
    (!hasWildcard && pathSegments.length !== fixedSegments.length)
  ) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < fixedSegments.length; index += 1) {
    const expected = fixedSegments[index];
    const actual = decodeSegment(pathSegments[index]);
    if (actual === null) return null;

    if (expected.startsWith(":")) {
      params[expected.slice(1)] = actual;
      continue;
    }

    if (decodeSegment(expected) !== actual) return null;
  }

  return params;
};
