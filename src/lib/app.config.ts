/**
 * Application configuration types
 * This file contains the type definitions for the application configuration
 */

import { LucideIcon } from 'lucide-react';

/**
 * Theme configuration for accent colors
 * HSL format: hue saturation lightness
 */
export type AccentColor = {
  name: string;
  value: string;
  foreground: string;
};

export type ThemeConfig = {
  /**
   * Available accent colors for the application
   */
  accentColors: AccentColor[];

  /**
   * Default accent color name
   * Must match one of the names in accentColors
   */
  defaultAccentColor: string;
};

export type AppConfig = {
  /**
   * The title of the application, displayed in the header and browser tab
   */
  title: string;

  /**
   * Optional subtitle displayed below the title
   */
  subtitle?: string;

  /**
   * Application icon
   * Can be:
   * - A Lucide icon component (see https://lucide.dev/icons/ for all available icons)
   * - A path to a resource in the public folder (e.g., '/images/logo.svg')
   * - A fully qualified URL
   */
  icon: LucideIcon | string;

  /**
   * Theme configuration
   */
  theme: ThemeConfig;
};
