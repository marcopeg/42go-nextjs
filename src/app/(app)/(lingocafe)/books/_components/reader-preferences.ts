import type { CSSProperties } from "react";

export type ReaderPreferences = {
  fontSizeIndex: number;
  fontFamilyKey: string;
  backgroundKey: string;
  foregroundKey: string;
};

export type ReaderThemeMode = "light" | "dark";
export type ReaderThemeProfileKey = "light" | "dark" | "system";
export type ReaderPreferencesStore = Partial<
  Record<ReaderThemeProfileKey, ReaderPreferences>
> & {
  sharedFontSizeIndex?: number;
};

export type ReaderPreferenceOption = {
  key: string;
  label: string;
  value: string;
};

export const READER_PREFERENCES_STORAGE_KEY =
  "lingocafe.reader.preferences.v1";
export const READER_APP_BACKGROUND_KEY = "app-background";
export const READER_APP_FOREGROUND_KEY = "app-foreground";

export const READER_FONT_SIZE_OPTIONS = [16, 17, 18, 19, 20, 21, 22, 24, 26, 28];

export const READER_FONT_OPTIONS: Array<
  ReaderPreferenceOption & {
    family: string;
    sample: string;
  }
> = [
  {
    key: "georgia",
    label: "Georgia",
    family: 'Georgia, "Times New Roman", serif',
    sample: "Classic serif with a calm page rhythm.",
    value: 'Georgia, "Times New Roman", serif',
  },
  {
    key: "palatino",
    label: "Palatino",
    family: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
    sample: "Open serif shapes with a lighter feel.",
    value: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  },
  {
    key: "arial",
    label: "Arial",
    family: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    sample: "Neutral sans serif. Clear and familiar.",
    value: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  },
  {
    key: "verdana",
    label: "Verdana",
    family: "Verdana, Geneva, sans-serif",
    sample: "Wide letters built for on-screen reading.",
    value: "Verdana, Geneva, sans-serif",
  },
  {
    key: "trebuchet",
    label: "Trebuchet MS",
    family: '"Trebuchet MS", Helvetica, sans-serif',
    sample: "Humanist sans with more personality.",
    value: '"Trebuchet MS", Helvetica, sans-serif',
  },
  {
    key: "tahoma",
    label: "Tahoma",
    family: "Tahoma, Geneva, sans-serif",
    sample: "Compact sans serif with sturdy letterforms.",
    value: "Tahoma, Geneva, sans-serif",
  },
];

export const READER_BACKGROUND_OPTIONS: ReaderPreferenceOption[] = [
  {
    key: READER_APP_BACKGROUND_KEY,
    label: "Auto",
    value: "var(--background)",
  },
  { key: "paper", label: "Paper", value: "#f7f1e3" },
  { key: "linen", label: "Linen", value: "#efe2c6" },
  { key: "mist", label: "Mist", value: "#e8eef4" },
  { key: "stone", label: "Stone", value: "#dde3ea" },
  { key: "charcoal", label: "Charcoal", value: "#1f2937" },
  { key: "midnight", label: "Midnight", value: "#0f172a" },
];

export const READER_FOREGROUND_OPTIONS: ReaderPreferenceOption[] = [
  {
    key: READER_APP_FOREGROUND_KEY,
    label: "App",
    value: "var(--foreground)",
  },
  { key: "ink", label: "Ink", value: "#1f2937" },
  { key: "cocoa", label: "Cocoa", value: "#4b3527" },
  { key: "deep-sea", label: "Deep Sea", value: "#16324a" },
  { key: "chalk", label: "Chalk", value: "#f8fafc" },
  { key: "cream", label: "Cream", value: "#fef3c7" },
];

export const LIGHT_READER_PREFERENCES: ReaderPreferences = {
  fontSizeIndex: 5,
  fontFamilyKey: "georgia",
  backgroundKey: READER_APP_BACKGROUND_KEY,
  foregroundKey: READER_APP_FOREGROUND_KEY,
};

export const DARK_READER_PREFERENCES: ReaderPreferences = {
  fontSizeIndex: 5,
  fontFamilyKey: "georgia",
  backgroundKey: READER_APP_BACKGROUND_KEY,
  foregroundKey: READER_APP_FOREGROUND_KEY,
};

export const DEFAULT_READER_PREFERENCES = LIGHT_READER_PREFERENCES;

export const getDefaultReaderPreferences = (
  theme: ReaderThemeMode = "light"
) => (theme === "dark" ? DARK_READER_PREFERENCES : LIGHT_READER_PREFERENCES);

const getOption = <T extends ReaderPreferenceOption>(
  options: T[],
  key: string,
  fallbackKey: string
) =>
  options.find((option) => option.key === key) ??
  options.find((option) => option.key === fallbackKey) ??
  options[0];

const normalizeHex = (value: string) => {
  const source = value.replace("#", "");
  if (source.length === 3) {
    return source
      .split("")
      .map((chunk) => `${chunk}${chunk}`)
      .join("");
  }
  return source;
};

const hexToRgb = (value: string) => {
  const source = normalizeHex(value);
  const parsed = Number.parseInt(source, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

const getLuminance = (value: string) => {
  const { r, g, b } = hexToRgb(value);
  const channels = [r, g, b].map((channel) => {
    const sRGB = channel / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : ((sRGB + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const getContrastRatio = (background: string, foreground: string) => {
  const lighter = Math.max(
    getLuminance(background),
    getLuminance(foreground)
  );
  const darker = Math.min(
    getLuminance(background),
    getLuminance(foreground)
  );

  return (lighter + 0.05) / (darker + 0.05);
};

const withAlpha = (value: string, alpha: number) => {
  if (value.startsWith("var(")) {
    return `color-mix(in oklab, ${value} ${Math.round(alpha * 100)}%, transparent)`;
  }

  const { r, g, b } = hexToRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const withColorMix = (
  base: string,
  basePercent: number,
  accent: string,
  accentPercent: number
) =>
  `color-mix(in oklab, ${base} ${basePercent}%, ${accent} ${accentPercent}%)`;

const getContrastColorFallback = (
  key: string,
  theme: ReaderThemeMode,
  type: "background" | "foreground"
) => {
  if (type === "background" && key === READER_APP_BACKGROUND_KEY) {
    return theme === "dark" ? "#1f2937" : "#ffffff";
  }

  if (type === "foreground" && key === READER_APP_FOREGROUND_KEY) {
    return theme === "dark" ? "#f8fafc" : "#1f2937";
  }

  return null;
};

export const getReaderFont = (preferences: ReaderPreferences) =>
  getOption(
    READER_FONT_OPTIONS,
    preferences.fontFamilyKey,
    DEFAULT_READER_PREFERENCES.fontFamilyKey
  );

export const getReaderBackground = (preferences: ReaderPreferences) =>
  getOption(
    READER_BACKGROUND_OPTIONS,
    preferences.backgroundKey,
    DEFAULT_READER_PREFERENCES.backgroundKey
  );

export const getAvailableReaderForegrounds = (
  backgroundKey: string,
  theme: ReaderThemeMode = "light"
) => {
  const background = getOption(
    READER_BACKGROUND_OPTIONS,
    backgroundKey,
    DEFAULT_READER_PREFERENCES.backgroundKey
  );
  const backgroundValue =
    getContrastColorFallback(background.key, theme, "background") ??
    background.value;

  return READER_FOREGROUND_OPTIONS.filter(
    (foreground) =>
      getContrastRatio(
        backgroundValue,
        getContrastColorFallback(foreground.key, theme, "foreground") ??
          foreground.value
      ) >= 4.5
  );
};

export const getReaderForeground = (
  preferences: ReaderPreferences,
  theme: ReaderThemeMode = "light"
) => {
  const foregrounds = getAvailableReaderForegrounds(
    preferences.backgroundKey,
    theme
  );

  return (
    foregrounds.find((foreground) => foreground.key === preferences.foregroundKey) ??
    foregrounds[0] ??
    getOption(
      READER_FOREGROUND_OPTIONS,
      DEFAULT_READER_PREFERENCES.foregroundKey,
      DEFAULT_READER_PREFERENCES.foregroundKey
    )
  );
};

export const getReaderFontSize = (preferences: ReaderPreferences) =>
  READER_FONT_SIZE_OPTIONS[
    Math.min(
      READER_FONT_SIZE_OPTIONS.length - 1,
      Math.max(0, preferences.fontSizeIndex)
    )
  ] ?? READER_FONT_SIZE_OPTIONS[DEFAULT_READER_PREFERENCES.fontSizeIndex];

export const sanitizeReaderFontSizeIndex = (value: unknown) =>
  typeof value === "number"
    ? Math.min(
        READER_FONT_SIZE_OPTIONS.length - 1,
        Math.max(0, Math.round(value))
      )
    : null;

export const sanitizeReaderPreferences = (
  input: Partial<ReaderPreferences> | null | undefined
): ReaderPreferences => {
  const next: ReaderPreferences = {
    fontSizeIndex:
      typeof input?.fontSizeIndex === "number"
        ? Math.min(
            READER_FONT_SIZE_OPTIONS.length - 1,
            Math.max(0, Math.round(input.fontSizeIndex))
          )
        : DEFAULT_READER_PREFERENCES.fontSizeIndex,
    fontFamilyKey:
      typeof input?.fontFamilyKey === "string"
        ? input.fontFamilyKey
        : DEFAULT_READER_PREFERENCES.fontFamilyKey,
    backgroundKey:
      typeof input?.backgroundKey === "string"
        ? input.backgroundKey
        : DEFAULT_READER_PREFERENCES.backgroundKey,
    foregroundKey:
      typeof input?.foregroundKey === "string"
        ? input.foregroundKey
        : DEFAULT_READER_PREFERENCES.foregroundKey,
  };

  const font = getReaderFont(next);
  const background = getReaderBackground(next);
  const foregrounds = getAvailableReaderForegrounds(background.key);
  const foreground =
    foregrounds.find((option) => option.key === next.foregroundKey) ??
    foregrounds[0];

  return {
    fontSizeIndex: next.fontSizeIndex,
    fontFamilyKey: font.key,
    backgroundKey: background.key,
    foregroundKey:
      foreground?.key ?? DEFAULT_READER_PREFERENCES.foregroundKey,
  };
};

const isReaderPreferencesRecord = (
  value: unknown
): value is Partial<ReaderPreferences> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const candidate = value as Record<string, unknown>;

  return (
    "fontSizeIndex" in candidate ||
    "fontFamilyKey" in candidate ||
    "backgroundKey" in candidate ||
    "foregroundKey" in candidate
  );
};

export const sanitizeReaderPreferencesStore = (
  input: unknown
): ReaderPreferencesStore => {
  if (isReaderPreferencesRecord(input)) {
    const legacy = sanitizeReaderPreferences(input);

    return {
      sharedFontSizeIndex: legacy.fontSizeIndex,
      light: legacy,
      dark: legacy,
      system: legacy,
    };
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const raw = input as Record<string, unknown>;
  const next: ReaderPreferencesStore = {};
  const sharedFontSizeIndex = sanitizeReaderFontSizeIndex(
    raw.sharedFontSizeIndex
  );

  if (sharedFontSizeIndex !== null) {
    next.sharedFontSizeIndex = sharedFontSizeIndex;
  }

  if (isReaderPreferencesRecord(raw.light)) {
    next.light = sanitizeReaderPreferences(raw.light);
  }

  if (isReaderPreferencesRecord(raw.dark)) {
    next.dark = sanitizeReaderPreferences(raw.dark);
  }

  if (isReaderPreferencesRecord(raw.system)) {
    next.system = sanitizeReaderPreferences(raw.system);
  }

  if (
    sharedFontSizeIndex === null &&
    (next.light || next.dark || next.system)
  ) {
    next.sharedFontSizeIndex =
      next.light?.fontSizeIndex ??
      next.dark?.fontSizeIndex ??
      next.system?.fontSizeIndex;
  }

  return next;
};

export const readStoredReaderPreferencesStore = () => {
  try {
    const raw = localStorage.getItem(READER_PREFERENCES_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeReaderPreferencesStore(JSON.parse(raw));
  } catch {
    return {};
  }
};

export const getReaderThemeStyle = (
  preferences: ReaderPreferences,
  theme: ReaderThemeMode = "light"
): CSSProperties => {
  const background = getReaderBackground(preferences);
  const foreground = getReaderForeground(preferences, theme);

  return {
    backgroundColor: background.value,
    color: foreground.value,
    borderColor: withAlpha(foreground.value, 0.16),
    ["--reader-bg" as string]: background.value,
    ["--reader-fg" as string]: foreground.value,
    ["--reader-fg-muted" as string]: withAlpha(foreground.value, 0.7),
    ["--reader-fg-soft" as string]: withAlpha(foreground.value, 0.08),
    ["--reader-hover-bg" as string]: withColorMix(
      background.value,
      88,
      foreground.value,
      12
    ),
    ["--reader-highlight-bg" as string]: withColorMix(
      background.value,
      76,
      foreground.value,
      24
    ),
    ["--reader-highlight-fg" as string]: foreground.value,
    ["--reader-popover-bg" as string]: withColorMix(
      background.value,
      94,
      foreground.value,
      6
    ),
    ["--reader-popover-border" as string]: withAlpha(foreground.value, 0.32),
    ["--reader-border" as string]: withAlpha(foreground.value, 0.18),
  };
};
