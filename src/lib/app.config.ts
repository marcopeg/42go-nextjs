/**
 * Application configuration
 * This file contains global settings that can be changed by developers
 */

import { AccentColor, accentColors } from './theme-config';
import { Layers } from 'lucide-react';

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
   * - A Lucide icon name (see https://lucide.dev/icons/ for all available icons)
   * - A path to a resource in the public folder (e.g., '/images/logo.svg')
   * - A fully qualified URL
   */
  icon: typeof Layers | string;

  /**
   * The default accent color for the application
   * This can be changed by users in the settings
   */
  accentColor: AccentColor;
};

/**
 * Default application configuration
 */
const appConfig: AppConfig = {
  title: 'Cursor Next Boilerplate',
  subtitle: 'Build amazing apps faster',
  // Default icon is Layers from Lucide
  // For all available icons, see: https://lucide.dev/icons/
  icon: Layers,
  accentColor: accentColors.find(color => color.name === 'orange') || accentColors[0],
};

export default appConfig;
