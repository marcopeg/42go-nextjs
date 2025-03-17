/**
 * Theme configuration for accent colors
 * HSL format: hue saturation lightness
 */

export type AccentColor = {
  name: string;
  value: string;
  foreground: string;
};

export const accentColors: AccentColor[] = [
  {
    name: 'orange',
    value: '24 95% 50%',
    foreground: '0 0% 100%',
  },
  {
    name: 'blue',
    value: '221 83% 53%',
    foreground: '0 0% 100%',
  },
  {
    name: 'green',
    value: '142 71% 45%',
    foreground: '0 0% 100%',
  },
  {
    name: 'purple',
    value: '262 83% 58%',
    foreground: '0 0% 100%',
  },
  {
    name: 'pink',
    value: '330 81% 60%',
    foreground: '0 0% 100%',
  },
  {
    name: 'red',
    value: '0 84% 60%',
    foreground: '0 0% 100%',
  },
];
