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
   * Top section menu items for logged-in users
   */
  top: MenuItem[];

  /**
   * Bottom section menu items for logged-in users
   */
  bottom: MenuItem[];
};

/**
 * Hero section configuration
 */
export type HeroConfig = {
  title: string;
  subtitle: string;
  actions: {
    label: string;
    href: string;
    role?: string;
  }[];
};

/**
 * Testimonial configuration
 */
export type TestimonialConfig = {
  title: string;
  subtitle: string;
  adopters: {
    id: number;
    name: string;
    logo: string;
  }[];
  quotes: {
    id: number;
    content: string;
    author: {
      name: string;
      role: string;
      company: string;
      avatar: string;
    };
  }[];
};

/**
 * Pricing tier configuration
 */
export type PricingTierConfig = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: {
    text: string;
    status: string;
  }[];
  cta: {
    label: string;
    href: string;
  };
  highlighted?: boolean;
  badge?: string;
};

/**
 * Pricing section configuration
 */
export type PricingConfig = {
  title: string;
  subtitle: string;
  tiers: PricingTierConfig[];
};

/**
 * Feedback form configuration
 */
export type FeedbackFormConfig = {
  title: string;
  description: string;
  fields: {
    email: {
      label: string;
      placeholder: string;
    };
    message: {
      label: string;
      placeholder: string;
      rows: number;
    };
  };
  button: {
    label: string;
    loadingLabel: string;
  };
  success: {
    title: string;
    message: string;
  };
  errors: {
    missing: {
      title: string;
      message: string;
    };
    captcha: {
      title: string;
      message: string;
    };
    default: {
      title: string;
      message: string;
    };
  };
};

/**
 * Feedback section configuration
 */
export type FeedbackConfig = {
  title: string;
  subtitle: string;
  form: FeedbackFormConfig;
};

/**
 * Feature item configuration
 */
export type FeatureItemConfig = {
  icon: LucideIcon;
  title: string;
  abstract: string;
};

/**
 * Features section configuration
 */
export type FeaturesConfig = {
  title: string;
  subtitle: string;
  items: FeatureItemConfig[];
};

/**
 * Landing page user configuration
 */
export type LandingUserConfig = {
  /**
   * Public menu items for non-logged-in users
   */
  menu: MenuItem[];
};

/**
 * Landing page configuration
 */
export type LandingConfig = {
  /**
   * Hero section on the landing page
   */
  hero: HeroConfig;

  /**
   * Testimonials section on the landing page
   */
  testimonials: TestimonialConfig;

  /**
   * Pricing section on the landing page
   */
  pricing: PricingConfig;

  /**
   * Feedback section on the landing page
   */
  feedback: FeedbackConfig;

  /**
   * Features section on the landing page
   */
  features: FeaturesConfig;

  /**
   * User-related configurations for the landing page
   */
  user: LandingUserConfig;
};

/**
 * Application configuration
 */
export type AppConfig = {
  /**
   * The application icon
   */
  icon: LucideIcon;

  /**
   * The application title
   */
  title: string;

  /**
   * The application subtitle
   */
  subtitle: string;

  /**
   * App-specific configurations (authenticated user experience)
   */
  app?: {
    /**
     * Mobile-specific configurations
     */
    mobile?: {
      /**
       * Mobile menu configurations
       */
      menu?: {
        /**
         * Width of the mobile menu as percentage of viewport
         */
        width: string;
      };
    };

    /**
     * Menu configurations for authenticated users
     */
    menu?: {
      /**
       * Top section menu items
       */
      top: MenuItem[];

      /**
       * Bottom section menu items
       */
      bottom: MenuItem[];
    };
  };

  /**
   * Landing page configuration
   */
  landing?: LandingConfig;
};
