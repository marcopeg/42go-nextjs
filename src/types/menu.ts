import { LucideIcon } from 'lucide-react';

export interface MenuItem {
  title: string;
  href: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  action?: string;
  grants?: string[]; // Array of grant IDs required to access this menu item
}

export interface MenuConfig {
  sidebar: MenuItem[];
  public: MenuItem[];
}

// This file is now redundant since we've moved these types to src/lib/app.config.ts
// We'll keep it for backward compatibility but mark it as deprecated
/**
 * @deprecated Use the types from src/lib/app.config.ts instead
 */
export interface AppConfig {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  mobile: {
    menu: {
      width: string;
    };
  };
  menu: MenuConfig;
  // These properties are not used in our current task
  hero: Record<string, unknown>;
  testimonials: Record<string, unknown>;
  pricing: Record<string, unknown>;
  feedback: Record<string, unknown>;
  features: Record<string, unknown>;
  theme: Record<string, unknown>;
}
