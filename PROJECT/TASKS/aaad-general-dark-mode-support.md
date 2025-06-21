# General Dark Mode Support

## Goal

Support dark mode (light/dark theme) at Tailwind level.

## Acceptance Criteria

- [x] light and dark mode themes are generally available for the app and the ui components
- [x] the app uses the user's system settings
- [x] the user can switch theme with a UI control
- [x] the user's choice is persisted in Local Storage

### Implementation Summary

1. **Tailwind Configuration:**

   - Created `tailwind.config.js` with darkMode set to 'class'
   - Updated `components.json` to reference the new configuration

2. **Theme Provider:**

   - Installed `next-themes` package
   - Created a `ThemeProvider` component that wraps the application
   - Implemented a custom `useTheme` hook to manage theme state

3. **Theme Toggle:**

   - Added a `ThemeToggle` component using shadcn/ui `dropdown-menu`
   - Implemented options for light, dark, and system themes
   - Added proper dark mode styling to the toggle button

4. **Dark Mode Styling:**

   - Added dark mode classes to all pages
   - Used appropriate dark mode text and background colors
   - Ensured consistent styling across components

5. **System Theme Detection:**

   - Implemented system theme detection using next-themes library
   - Added a "system" option in the theme toggle dropdown
   - Ensured seamless transition between themes

6. **Theme Persistence:**
   - Used next-themes library to automatically persist theme choice in localStorage
   - Ensured correct theme is applied on page reload

### Modified Files

- Created `tailwind.config.js` for dark mode support
- Updated `components.json` to reference the Tailwind config
- Created `src/components/ThemeProvider.tsx` for theme management
- Created `src/components/ThemeToggle.tsx` for theme switching UI
- Updated `src/app/layout.tsx` to include ThemeProvider and ThemeToggle
- Added dark mode styles to `src/app/page.tsx` and `src/app/todos/page.tsx`

### Libraries Used

- Added `next-themes` package for theme management
- Used existing `shadcn/ui` components for UI elements
