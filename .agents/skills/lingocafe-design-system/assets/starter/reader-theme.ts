import type { CSSProperties } from "react";

export const readerFontSizes = [16, 17, 18, 19, 20, 21, 22, 24, 26, 28];

export const readerFonts = [
  { key: "georgia", label: "Georgia", family: 'Georgia, "Times New Roman", serif' },
  { key: "palatino", label: "Palatino", family: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { key: "arial", label: "Arial", family: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { key: "verdana", label: "Verdana", family: "Verdana, Geneva, sans-serif" },
  { key: "trebuchet", label: "Trebuchet MS", family: '"Trebuchet MS", Helvetica, sans-serif' },
  { key: "tahoma", label: "Tahoma", family: "Tahoma, Geneva, sans-serif" },
] as const;

export const readerBackgrounds = [
  { key: "app-background", label: "Auto", value: "var(--background)" },
  { key: "paper", label: "Paper", value: "#f7f1e3" },
  { key: "linen", label: "Linen", value: "#efe2c6" },
  { key: "mist", label: "Mist", value: "#e8eef4" },
  { key: "stone", label: "Stone", value: "#dde3ea" },
  { key: "charcoal", label: "Charcoal", value: "#1f2937" },
  { key: "midnight", label: "Midnight", value: "#0f172a" },
] as const;

export const readerForegrounds = [
  { key: "app-foreground", label: "App", value: "var(--foreground)" },
  { key: "ink", label: "Ink", value: "#1f2937" },
  { key: "cocoa", label: "Cocoa", value: "#4b3527" },
  { key: "deep-sea", label: "Deep Sea", value: "#16324a" },
  { key: "chalk", label: "Chalk", value: "#f8fafc" },
  { key: "cream", label: "Cream", value: "#fef3c7" },
] as const;

export type ReaderThemeMode = "light" | "dark";

const rgb = (hex: string) => {
  const source = hex.slice(1);
  const value = Number.parseInt(source.length === 3 ? source.replace(/(.)/g, "$1$1") : source, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const luminance = (hex: string) => {
  const values = Object.values(rgb(hex)).map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
};

export const contrastRatio = (left: string, right: string) => {
  const lighter = Math.max(luminance(left), luminance(right));
  const darker = Math.min(luminance(left), luminance(right));
  return (lighter + 0.05) / (darker + 0.05);
};

const contrastFallback = (
  key: string,
  theme: ReaderThemeMode,
  role: "background" | "foreground"
) => {
  if (role === "background" && key === "app-background") {
    return theme === "dark" ? "#1f2937" : "#ffffff";
  }
  if (role === "foreground" && key === "app-foreground") {
    return theme === "dark" ? "#f8fafc" : "#1f2937";
  }
  return null;
};

export const getAvailableReaderForegrounds = (
  backgroundKey: string,
  theme: ReaderThemeMode = "light"
) => {
  const background =
    readerBackgrounds.find(option => option.key === backgroundKey) ??
    readerBackgrounds[0];
  const backgroundValue =
    contrastFallback(background.key, theme, "background") ?? background.value;

  return readerForegrounds.filter(foreground => {
    const foregroundValue =
      contrastFallback(foreground.key, theme, "foreground") ?? foreground.value;
    return contrastRatio(backgroundValue, foregroundValue) >= 4.5;
  });
};

const alpha = (value: string, amount: number) => {
  if (value.startsWith("var(")) {
    return `color-mix(in oklab, ${value} ${Math.round(amount * 100)}%, transparent)`;
  }
  const { r, g, b } = rgb(value);
  return `rgba(${r}, ${g}, ${b}, ${amount})`;
};

export const getReaderStyle = (background: string, foreground: string): CSSProperties => ({
  backgroundColor: background,
  color: foreground,
  ["--reader-bg" as string]: background,
  ["--reader-fg" as string]: foreground,
  ["--reader-fg-muted" as string]: alpha(foreground, 0.7),
  ["--reader-fg-soft" as string]: alpha(foreground, 0.08),
  ["--reader-hover-bg" as string]: `color-mix(in oklab, ${background} 88%, ${foreground} 12%)`,
  ["--reader-highlight-bg" as string]: `color-mix(in oklab, ${background} 76%, ${foreground} 24%)`,
  ["--reader-highlight-fg" as string]: foreground,
  ["--reader-popover-bg" as string]: `color-mix(in oklab, ${background} 94%, ${foreground} 6%)`,
  ["--reader-popover-border" as string]: alpha(foreground, 0.32),
  ["--reader-border" as string]: alpha(foreground, 0.18),
});
