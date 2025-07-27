# Theming Guide

This document provides comprehensive guidance on customizing the light and dark themes in this Next.js application.

- Architecture Overview
- Theme Configuration
- CSS Theme Variables
- Setup the App's default theme
- Customize the App primary color
-

## Architecture Overview

The theming system is built on three core technologies:

1. **next-themes** - Theme management and persistence
2. **Tailwind CSS** - Utility-first CSS framework with built-in dark mode support
3. **CSS Custom Properties** - Dynamic theme variables

### Relevant Files:

- `tailwind.config.js`
- `@/lib/config/ThemeProvider.tsx`
- `@/app/globals.css`  
   _lists the default values and available themes_

### Why class-based?

This approach uses a `.dark` class on the HTML element to toggle dark mode, providing:

- Better performance than media query approach
- User control over theme selection
- Perfect SSR compatibility

## CSS Theme Variables

All theme customization is done through CSS custom properties defined in `src/app/globals.css`.

### Light Theme Variables (`:root`)

```css
:root {
  --background: oklch(1 0 0); /* Pure white background */
  --foreground: oklch(0.145 0 0); /* Near-black text */
  --primary: oklch(0.205 0 0); /* Dark gray for primary elements */
  --primary-foreground: oklch(0.985 0 0); /* Light text on primary */
  /* ... more variables */
}
```

### Dark Theme Variables (`.dark`)

```css
.dark {
  --background: oklch(0.145 0 0); /* Dark background */
  --foreground: oklch(0.985 0 0); /* Light text */
  --primary: oklch(0.922 0 0); /* Light primary elements */
  --primary-foreground: oklch(0.205 0 0); /* Dark text on primary */
  /* ... more variables */
}
```

## Color System

### OKLCH Color Space

This project uses the modern OKLCH color space for better color consistency:

```css
/* OKLCH format: oklch(lightness chroma hue / alpha) */
--color: oklch(0.7 0.15 280); /* 70% lightness, 15% chroma, 280° hue */
```

**Benefits of OKLCH:**

- Perceptually uniform colors
- Better contrast ratios
- More predictable color mixing
- Future-proof CSS standard

### Available Theme Variables

| Variable        | Purpose              | Light Value     | Dark Value     |
| --------------- | -------------------- | --------------- | -------------- |
| `--background`  | Main background      | White           | Dark gray      |
| `--foreground`  | Main text color      | Dark gray       | Light gray     |
| `--primary`     | Primary elements     | Dark            | Light          |
| `--secondary`   | Secondary elements   | Light gray      | Medium gray    |
| `--muted`       | Muted backgrounds    | Very light gray | Dark gray      |
| `--accent`      | Accent elements      | Light gray      | Medium gray    |
| `--destructive` | Error/danger states  | Red             | Red (adjusted) |
| `--border`      | Borders and dividers | Light gray      | Dark gray      |
| `--ring`        | Focus rings          | Medium gray     | Medium gray    |

## Customizing Themes

### Method 1: Modify CSS Variables

Edit `src/app/globals.css` to change theme colors:

```css
:root {
  /* Custom light theme */
  --background: oklch(0.98 0.01 120); /* Subtle green tint */
  --primary: oklch(0.4 0.2 240); /* Blue primary */
}

.dark {
  /* Custom dark theme */
  --background: oklch(0.1 0.02 240); /* Dark blue background */
  --primary: oklch(0.7 0.25 240); /* Bright blue primary */
}
```

### Method 2: Using Tailwind Classes

Apply theme-aware classes in your components:

```tsx
export function MyComponent() {
  return (
    <div className="bg-background text-foreground border border-border">
      <h1 className="text-primary">Title</h1>
      <p className="text-muted-foreground">Subtitle</p>
      <button className="bg-primary text-primary-foreground hover:bg-primary/90">
        Action
      </button>
    </div>
  );
}
```

### Method 3: Custom Theme Variants

Add your own theme variables:

```css
:root {
  --success: oklch(0.6 0.2 120); /* Green for success */
  --warning: oklch(0.7 0.2 60); /* Yellow for warnings */
}

.dark {
  --success: oklch(0.7 0.2 120);
  --warning: oklch(0.8 0.2 60);
}
```

Then extend Tailwind configuration:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        success: "oklch(var(--success))",
        warning: "oklch(var(--warning))",
      },
    },
  },
};
```

## Component Theming

### Using Theme Context

Access current theme in components:

```tsx
import { useTheme } from "@/lib/config/ThemeProvider";

export function ThemedComponent() {
  const { theme, setTheme, mounted } = useTheme();

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) return null;

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme("dark")}>Switch to Dark</button>
    </div>
  );
}
```

### Theme-Aware Styling

Use conditional classes based on theme:

```tsx
export function ConditionalComponent() {
  const { resolvedTheme } = useTheme();

  return (
    <div
      className={`
        p-4 rounded-lg
        ${
          resolvedTheme === "dark"
            ? "bg-gray-800 text-white"
            : "bg-white text-gray-900"
        }
      `}
    >
      Content with conditional styling
    </div>
  );
}
```

### Preferred Approach: CSS Variables

Instead of conditional classes, use CSS variables for automatic theme switching:

```tsx
export function OptimalComponent() {
  return (
    <div className="bg-background text-foreground p-4 rounded-lg border border-border">
      {/* Automatically themed without JavaScript */}
      <h2 className="text-primary">Always Properly Themed</h2>
      <p className="text-muted-foreground">Subtitle text</p>
    </div>
  );
}
```

## Best Practices

### 1. Use CSS Variables Over Conditional Classes

❌ **Avoid:**

```tsx
<div className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
```

✅ **Prefer:**

```tsx
<div className="bg-background">
```

### 2. Handle Mounting State

Always check if the theme is mounted before rendering theme-dependent content:

```tsx
const { mounted } = useTheme();
if (!mounted) return <div>Loading...</div>;
```

### 3. Provide Fallback Styling

Ensure components look good even if theme variables aren't loaded:

```css
.my-component {
  background: white; /* fallback */
  background: oklch(var(--background)); /* theme-aware */
  color: black; /* fallback */
  color: oklch(var(--foreground)); /* theme-aware */
}
```

### 4. Test Both Themes

Always test your components in both light and dark modes:

```tsx
// Use this component during development
export function ThemeToggler() {
  const { setTheme } = useTheme();
  return (
    <div className="fixed bottom-4 right-4 space-x-2">
      <button onClick={() => setTheme("light")}>☀️</button>
      <button onClick={() => setTheme("dark")}>🌙</button>
    </div>
  );
}
```

## Advanced Customization

### App-Specific Default Themes

Configure different default themes per app using the App Config system:

```typescript
// src/AppConfig.ts
export const availableApps = {
  marketing: {
    name: "Marketing Site",
    theme: {
      default: "light", // Always starts with light theme
    },
    // ... other config
  },
  dashboard: {
    name: "Admin Dashboard",
    theme: {
      default: "dark", // Always starts with dark theme
    },
    // ... other config
  },
  webapp: {
    name: "Main App",
    theme: {
      default: "system", // Respects user's system preference
    },
    // ... other config
  },
} satisfies Record<string, AppConfigItem>;
```

**Theme Precedence**: The theme system follows this priority order:

1. **User's saved preference** (localStorage) - highest priority
2. **App's default theme** (from config) - if no user preference
3. **System preference** - final fallback

**Benefits**:

- Each app can have its own visual identity
- Marketing sites can enforce light themes for readability
- Developer tools can default to dark themes for comfort
- User preferences always take precedence when set

### Multiple Theme Support

Extend the system to support more than light/dark:

```tsx
// Custom theme provider
export function MultiThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      themes={["light", "dark", "blue", "green"]}
      defaultTheme="system"
    >
      {children}
    </NextThemesProvider>
  );
}
```

### Per-Page Themes

Override theme for specific pages:

```tsx
// pages/special-page.tsx
export default function SpecialPage() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const originalTheme = theme;
    setTheme("dark"); // Force dark theme for this page

    return () => setTheme(originalTheme); // Restore on unmount
  }, []);

  return <div>Always dark page</div>;
}
```

### Theme Transitions

Add smooth transitions between themes:

```css
* {
  transition: background-color 0.2s ease, color 0.2s ease,
    border-color 0.2s ease;
}
```

## Troubleshooting

### Hydration Warnings

If you see hydration warnings:

1. Ensure `suppressHydrationWarning` is on the HTML element in layout.tsx
2. Use the `mounted` state from `useTheme()` before rendering theme-dependent content
3. Avoid theme-dependent rendering on the server side

### Flash of Incorrect Theme

If you see a flash of wrong theme on page load:

1. Verify `next-themes` is properly configured
2. Check that CSS variables are defined in `:root` and `.dark`
3. Ensure the theme provider wraps your entire app

### Colors Not Updating

If colors don't change with theme:

1. Verify you're using CSS variables: `oklch(var(--background))`
2. Check that Tailwind classes reference the correct variables
3. Ensure your CSS variables are defined in both light and dark themes

## Migration Guide

### From CSS-in-JS to CSS Variables

❌ **Old approach:**

```tsx
const styles = {
  background: theme === "dark" ? "#1a1a1a" : "#ffffff",
  color: theme === "dark" ? "#ffffff" : "#000000",
};

return <div style={styles}>Content</div>;
```

✅ **New approach:**

```tsx
return <div className="bg-background text-foreground">Content</div>;
```

### From Manual Theme Detection to next-themes

❌ **Old approach:**

```tsx
const [theme, setTheme] = useState("light");

useEffect(() => {
  const stored = localStorage.getItem("theme");
  if (stored) setTheme(stored);
}, []);
```

✅ **New approach:**

```tsx
const { theme, setTheme } = useTheme();
// Theme persistence handled automatically
```

## App-Specific Public Layouts

Beyond just colors, you can provide entirely different public-facing layouts for each app. This allows for significant structural changes, such as a narrow blog-style layout for one app and a wide, dashboard-style layout for another.

This is controlled by the `theme.PublicLayout` property in the App Config.

**Configuration:**

1.  **Create your custom layout component:**
    This should be a standard React component that accepts `children`.

    ```tsx
    // src/components/MyCustomLayout/index.tsx
    import { ReactNode } from "react";

    export const MyCustomLayout = ({ children }: { children: ReactNode }) => (
      <div className="my-custom-styles">
        <header>Custom Header</header>
        <main>{children}</main>
        <footer>Custom Footer</footer>
      </div>
    );

    export default MyCustomLayout;
    ```

2.  **Update `AppConfig.ts`:**
    Import your new layout and assign it to the `PublicLayout` property for the desired app.

    ```typescript
    // src/AppConfig.ts
    import { MyCustomLayout } from "@/components/MyCustomLayout";
    // ... other imports

    export interface AppConfigItem {
      // ...
      theme?: {
        default?: ThemeValue;
        PublicLayout?: React.ComponentType<{ children: React.ReactNode }>;
      };
      // ...
    }

    export const availableApps = {
      appWithCustomLayout: {
        name: "Special App",
        theme: {
          PublicLayout: MyCustomLayout,
        },
        // ... other config
      },
      anotherApp: {
        name: "Standard App",
        // No PublicLayout, will use the default one
      },
    } satisfies Record<string, AppConfigItem>;
    ```

**How it Works:**

The root public layout at `src/app/(public)/layout.tsx` automatically checks for this configuration property.

```tsx
// src/app/(public)/layout.tsx
import { PublicLayout } from "@/components/PublicLayout";
import { getAppConfig } from "@/lib/config/app-config";

export default async function PublicRouteLayout({ children }) {
  const config = await getAppConfig();
  // Use the custom layout if provided, otherwise fall back to the default
  const LayoutComponent = config?.theme?.PublicLayout || PublicLayout;

  return <LayoutComponent>{children}</LayoutComponent>;
}
```

If `theme.PublicLayout` is defined for the current app, that component will be used to wrap the public pages. If it's not defined, the system gracefully falls back to the default `PublicLayout` component. This provides powerful customization with a safe default.
