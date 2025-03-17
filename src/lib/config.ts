/**
 * Configuration loader
 * This file imports the configuration from the root app.config.mjs file
 * and applies the proper TypeScript types
 */

import { AppConfig, AccentColor } from './app.config';
import appConfigValues from '../../app.config.mjs';

// Cast the imported config to the AppConfig type
const rawConfig = appConfigValues as unknown as AppConfig;

// Find the default accent color object based on the name
const findAccentColor = (name: string, colors: AccentColor[]): AccentColor => {
  const color = colors.find(c => c.name === name);
  if (!color) {
    console.warn(
      `Warning: Accent color "${name}" not found in available colors. Using the first color as fallback.`
    );
    return colors[0];
  }
  return color;
};

// Create a processed config with resolved references
const appConfig: AppConfig & {
  theme: AppConfig['theme'] & {
    resolvedAccentColor: AccentColor;
  };
} = {
  ...rawConfig,
  theme: {
    ...rawConfig.theme,
    // Add the resolved accent color object
    resolvedAccentColor: findAccentColor(
      rawConfig.theme.defaultAccentColor,
      rawConfig.theme.accentColors
    ),
  },
};

export default appConfig;

// Re-export types for convenience
export type { AppConfig, AccentColor, ThemeConfig } from './app.config';
