# Features

## Basic Next.js Setup

- Basic Next.js app structure created in `./`.
- `shadcn/ui` initialized within the `./` directory.
- `shadcn/ui` Button component added to `./src/components/ui/button.tsx` and integrated into `./src/app/page.tsx`.

## Dynamic AppConfig System

Implemented a dynamic, request-specific configuration (`AppConfig`) system that allows for multi-tenant or multi-environment setups.

**Architecture:**

- The `AppConfig` interface, `SetupName` type (e.g., 'app1', 'default'), and `DEFAULT_SETUP_NAME` are defined in `src/AppConfig.type.ts`.
- Static configurations for each `SetupName` are stored in a `setups` dictionary in `src/AppConfig.ts`.
- Middleware (`src/middleware.ts`) resolves the `SetupName` based on request (hostname, `x-setup-name` header) and passes it via the `X-Setup-Name-Resolved` header.
- Server-side components use `getRequestConfig()` (from `src/lib/config.ts`) to get the `AppConfig` by reading the header and looking up in the `setups` dictionary.
- The root layout (`src/app/layout.tsx`) passes the resolved `setupName` string to the client via a script tag (`__APP_SETUP_NAME__`).
- Client-side components use `AppConfigProvider` (`src/components/AppConfigProvider.tsx`) which reads the `setupName` from the script tag, retrieves the full `AppConfig` from the static `setups` dictionary, and makes it available via React Context (`src/contexts/AppConfigContext.tsx`).

**Benefits:**

- This system avoids serializing the full `AppConfig` object in headers or script tags.
- Enables dynamic configuration per request without performance overhead.
- Maintains clean separation between server and client configuration access.

## Dark Theme Support

Comprehensive light/dark theme system implemented using `next-themes` library with enterprise-grade architecture and App Config integration.

**Core Components:**

- **Theme Provider Architecture**: Custom ThemeProvider component (`src/lib/config/ThemeProvider.tsx`) wraps the entire application, providing theme context with proper hydration handling and App Config integration.
- **Theme Toggle Component**: Dropdown-based theme switcher (`src/lib/config/ThemeToggle.tsx`) with Light, Dark, and System options.
- **App Config Integration**: Support for app-specific default theme configuration through the App Config system.

**Key Features:**

- **App-Specific Default Themes**: Each app can configure its own default theme (`light`, `dark`, or `system`) via the App Config
- **Smart Theme Precedence**: User preferences override app defaults, which override system preferences
- **Automatic System Detection**: Respects user's system preference by default, with seamless switching between light/dark modes
- **Theme Persistence**: User's theme choice is automatically saved to localStorage and persists across sessions
- **Hydration-Safe Implementation**: Proper handling of server-side rendering with targeted hydration warning suppression to prevent theme-related mismatches
- **Server-Side Theme Resolution**: Theme defaults are resolved server-side for optimal performance and reliability

**Technical Implementation:**

- **CSS Architecture**: Comprehensive theme variables using modern `oklch()` color space, with all shadcn/ui components properly themed
- **Tailwind Integration**: Class-based dark mode configuration (`darkMode: ["class"]`) for optimal Tailwind CSS compatibility
- **Performance Optimized**: Zero-flash theme transitions with proper mounting state handling
- **Type-Safe Configuration**: Full TypeScript support for theme values (`"light" | "dark" | "system"`)

**App Config Schema:**

```typescript
interface AppConfigItem {
  theme?: {
    default?: "light" | "dark" | "system";
  };
  // ... other properties
}
```

**Example Usage:**

Different apps can have different default themes:

- Marketing site: defaults to `"light"` for readability
- Developer dashboard: defaults to `"dark"` for comfort
- General app: defaults to `"system"` for user preference
