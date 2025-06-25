# Support Accent Color

I would like to set the accent color as part of the app's configuration:

```tsx
export const availableApps = {
  default: {
    theme: {
      colors: {
        accent: "oklch(0.7 0.15 180)", // Example: vibrant cyan
      },
    },
  },
  // App without accent color will use fallback
  minimalApp: {
    theme: {
      // No colors defined - will use neutral blue fallback
    },
  },
};
```

This should be somehow passed down to the CSS system so to be applied to stuff like:

- hero titles
- buttons background
- etc

I expect also that the foreground OR background of items that implement the accent color should be calculated automatically.

# Acceptance Criteria

- [ ] App1 defines a bright orange as accent, App2 defines a bright green
- [ ] App1's buttons have the bright orange as background color
- [ ] App2's buttons have the bright green as background color

## Development Plan

**Current State Analysis:**

- We have a robust theme system with CSS custom properties using `oklch()` color space
- The `accent` color already exists in the CSS system but is static
- We have an App Config system that can hold theme configuration
- The current accent color is used by shadcn/ui components

**Goal:**
Enable each app to define its own accent color in the App Config that dynamically updates the CSS custom properties for both light and dark themes, with automatic foreground color calculation.

### Step 1: Extend AppConfig Interface

- Add optional `colors.accent` property to the `AppConfigItem` interface in `src/AppConfig.ts`
- Define a neutral blue-ish fallback color: `oklch(0.65 0.12 240)` (professional blue)
- Update the example apps (`app1`, `app2`) with different accent colors as specified:
  - `app1`: bright orange (`oklch(0.7 0.25 50)`) - vibrant orange with good saturation
  - `app2`: bright green (`oklch(0.7 0.25 140)`) - vibrant green with matching saturation
  - `default`: keep without accent color to test fallback behavior

### Step 2: Create Dynamic Color Utility

- Create `src/lib/config/color-utils.ts` with functions to:
  - Define the neutral blue fallback color constant
  - Parse and validate `oklch()` color strings
  - Calculate appropriate foreground colors based on accent color lightness
  - Generate light/dark theme variants by adjusting lightness values
  - Ensure WCAG contrast compliance
  - Handle fallback logic when accent color is not provided

### Step 3: Extend ThemeProvider with Dynamic Color Injection

- Update `src/lib/config/ThemeProvider.tsx` to:
  - Accept optional accent color from App Config
  - Use neutral blue fallback when accent color is not provided
  - Inject CSS custom properties dynamically into the document
  - Handle both light and dark theme variants
  - Update accent colors when theme changes
  - Maintain existing theme functionality

### Step 4: Update Root Layout

- Ensure the enhanced ThemeProvider properly handles accent colors
- Verify server-side and client-side consistency

### Step 5: Test Implementation

- Verify that `app1` shows bright orange buttons
- Verify that `app2` shows bright green buttons
- Verify that `default` app shows neutral blue buttons (fallback)
- Test theme switching maintains accent colors
- Validate foreground/background contrast ratios
- Test apps without accent color configuration use fallback properly

### Technical Implementation Details:

**Color Conversion Strategy:**

- Use native `oklch()` colors in configuration for maximum precision
- Define neutral blue fallback: `oklch(0.65 0.12 240)` - professional, accessible blue
- Implement smart lightness adjustment algorithms for theme variants
- Create WCAG-compliant contrast calculations using oklch lightness values
- Support fallback parsing for other color formats if needed (hex, hsl) with conversion to oklch
- Graceful degradation when accent color is undefined or invalid

**CSS Variable Strategy:**

- Dynamically update `--accent` and `--accent-foreground` CSS variables
- Maintain compatibility with existing shadcn/ui components
- Support both light and dark theme modes

**Performance Considerations:**

- Use CSS-in-JS injection for dynamic properties
- Minimize re-renders with proper memoization
- Ensure no flash of unstyled content (FOUC)
