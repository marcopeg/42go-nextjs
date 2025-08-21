// Map PWA color shortcuts to theme-aligned hex values.
// These hexes align with our tokens.css themes:
// - light: root --background is white
// - dark: approximates .dark --background (oklch(0.15 0.02 250)) using a slate-900-esque hex

export type TColorInput = "light" | "dark" | `#${string}`;

const LIGHT_HEX = "#ffffff";
const DARK_HEX = "#0f172a"; // close to our dark background tone

const HEX_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const resolvePWAColor = (value?: TColorInput): string | undefined => {
  if (!value) return undefined;
  const v = value.toLowerCase() as TColorInput;
  if (v === "light") return LIGHT_HEX;
  if (v === "dark") return DARK_HEX;
  if (HEX_REGEX.test(v)) return v;
  return undefined;
};
