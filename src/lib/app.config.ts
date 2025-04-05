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

export type MobileConfig = {
  menu: {
    /**
     * Width of the mobile menu sidebar as a percentage of viewport width
     * @example '80%'
     */
    width: string;
  };
};

/**
 * Menu item configuration
 */
export type MenuItem = {
  /**
   * The title of the menu item
   */
  title: string;

  /**
   * The URL the menu item links to
   */
  href: string;

  /**
   * The icon to display for the menu item
   */
  icon: LucideIcon;

  /**
   * Whether this menu item requires authentication
   */
  requiresAuth?: boolean;

  /**
   * Special action to perform when clicked (e.g., 'logout')
   */
  action?: string;
};

/**
 * Menu configuration
 */
export type MenuConfig = {
  /**
   * Sidebar menu items for logged-in users
   */
  sidebar: MenuItem[];

  /**
   * Public menu items for non-logged-in users
   */
  public: MenuItem[];
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
   * Mobile-specific configurations
   */
  mobile?: MobileConfig;

  /**
   * Menu configurations
   */
  menu?: MenuConfig;

  /**
   * Theme configuration
   */
  theme: ThemeConfig;
};
