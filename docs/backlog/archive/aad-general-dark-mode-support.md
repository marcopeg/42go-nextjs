# General Dark Mode Support [aad]

## Goal

Support dark mode (light/dark theme) at Tailwind level.

## Acceptance Criteria

- [x] light and dark mode themes are generally available for the app and the ui components
- [x] the app uses the user's system settings
- [x] the user can switch theme with a UI control
- [x] the user's choice is persisted in Local Storage

### Implementation Summary

1. **Tailwind Configuration:**

   - Configured `tailwind.config.js` with `darkMode: ["class"]` for class-based theme switching
   - This allows Tailwind to apply dark mode styles when the `.dark` class is present on the HTML element

2. **Theme Provider Architecture:**

   - Installed `next-themes@^0.4.6` package for robust theme management
   - Created `src/lib/config/ThemeProvider.tsx` as a wrapper around NextThemesProvider
   - Configured with:
     - `attribute="class"` - Uses class-based theme switching (standard approach)
     - `defaultTheme="system"` - Respects user's system preference by default
     - `enableSystem` - Enables system theme detection
     - `disableTransitionOnChange` - Prevents flash during theme transitions
   - Implemented custom `useTheme` hook with proper mounting state to prevent hydration mismatches

3. **Theme Toggle Component:**

   - Created `src/lib/config/ThemeToggle.tsx` using shadcn/ui dropdown-menu
   - Features three theme options: Light, Dark, and System
   - Implements proper mounting state handling to prevent hydration issues
   - Uses Lucide React icons (Sun/Moon) with smooth transitions
   - Styled with dark mode variants for consistent appearance

4. **Hydration Issue Resolution:**

   - **Problem**: Server-side rendering doesn't know the user's theme preference, causing hydration mismatches
   - **Solution**: Added `suppressHydrationWarning` specifically to the `<html>` element in `layout.tsx`
   - **Why This Works**:
     - Only suppresses warnings for the specific HTML element where theme classes are applied
     - Does not hide other potential hydration issues in the app
     - This is the standard pattern recommended by `next-themes` documentation
   - **Architectural Decision**: Chose class-based approach over data attributes because:
     - Better ecosystem support and documentation
     - Standard Tailwind CSS approach
     - Simpler CSS selectors (`.dark` vs `[data-theme="dark"]`)

5. **CSS Architecture:**

   - Updated `src/app/globals.css` with comprehensive dark theme variables
   - Implements CSS custom properties (CSS variables) for both light and dark themes
   - Uses modern `oklch()` color space for better color consistency
   - Configured `@custom-variant dark` for Tailwind CSS v4 compatibility
   - All theme variables are properly scoped under `:root` (light) and `.dark` (dark)

6. **Layout Integration:**

   - Integrated ThemeProvider at the root level in `src/app/layout.tsx`
   - Added ThemeToggle to the navigation bar
   - Applied dark mode styles to navigation elements
   - Ensured theme provider wraps all content for consistent theming

7. **Theme Persistence:**
   - Automatic localStorage persistence via `next-themes`
   - Theme preference survives page reloads and browser sessions
   - Graceful fallback to system preference if no stored preference exists

### Modified Files

**Configuration Files:**

- `tailwind.config.js` - Added class-based dark mode configuration
- `package.json` - Added `next-themes` dependency

**Component Files:**

- `src/lib/config/ThemeProvider.tsx` - Theme provider wrapper with mounting state handling
- `src/lib/config/ThemeToggle.tsx` - Theme switching dropdown component
- `src/app/layout.tsx` - Integrated theme provider and toggle, added hydration warning suppression
- `src/app/globals.css` - Added comprehensive dark theme CSS variables

**Styling Files:**

- Added dark mode classes throughout the application
- Navigation bar with proper dark mode styling
- Consistent dark mode variants for all UI components

### Architectural Decisions & Rationale

1. **Class-based vs Data Attribute Approach:**

   - **Chosen**: `attribute="class"` with `darkMode: ["class"]`
   - **Rationale**: Industry standard, better Tailwind support, cleaner CSS selectors
   - **Alternative Considered**: `attribute="data-theme"` - rejected due to less ecosystem support

2. **Hydration Warning Handling:**

   - **Chosen**: Targeted `suppressHydrationWarning` on HTML element only
   - **Rationale**: Addresses the specific theme-related hydration mismatch without hiding other issues
   - **Alternative Considered**: Global suppression - rejected as it could mask real problems

3. **Theme Provider Location:**

   - **Chosen**: Root level in layout.tsx, wrapping all content
   - **Rationale**: Ensures consistent theme context throughout the entire application
   - **Alternative Considered**: Page-level providers - rejected due to inconsistent theming

4. **Component Architecture:**
   - **Chosen**: Separate ThemeProvider and ThemeToggle components
   - **Rationale**: Single responsibility principle, easier testing and maintenance
   - **Alternative Considered**: Combined component - rejected due to tight coupling

### Libraries Used

- Added `next-themes` package for theme management
- Used existing `shadcn/ui` components for UI elements
