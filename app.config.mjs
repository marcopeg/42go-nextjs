/**
 * Application configuration
 * This file contains global settings that can be changed by developers
 */

// Import the Layers icon from lucide-react
// For all available icons, see: https://lucide.dev/icons/
import { Layers } from 'lucide-react';

/**
 * Default application configuration
 */

export default {
  title: 'Cursor Boilerplate',
  subtitle: 'Build amazing apps faster',
  // Default icon is Layers from Lucide
  icon: Layers,
  theme: {
    accentColors: [
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
    ],
    // Default accent color name (must match one of the accent color names)
    defaultAccentColor: 'orange',
  },
};
