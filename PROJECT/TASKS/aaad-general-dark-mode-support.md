# General Dark Mode Support

## Goal

Support dark mode (light/dark theme) at Tailwind level.

## Acceptance Criteria

- [x] light and dark mode themes are generally available for the app and the ui components
- [x] the app uses the user's system settings
- [x] the user can switch theme with a UI control
- [x] the user's choice is persisted in Local Storage

## Development Plan

### Steps to Complete the Task

1. **Tailwind Configuration**:

   - Update the Tailwind CSS configuration to support light and dark themes.
   - Ensure the `darkMode` property is set to `class` for manual toggling.

2. **UI Components**:

   - Modify `src/components/ui/button.tsx` and other relevant components to support dark mode styling.
   - Use the `cn` utility function from `src/lib/utils.ts` for conditional class names.

3. **System Settings Integration**:

   - Implement logic to detect the user's system theme settings using `window.matchMedia`.

4. **Theme Toggle UI**:

   - Add a theme toggle button to the app layout (`src/app/layout.tsx`).
   - Use `shadcn/ui` components for the toggle button.

5. **Persist User Choice**:

   - Store the user's theme preference in Local Storage.
   - Retrieve the preference on app load and apply the theme.

6. **Testing**:
   - Verify the theme switch functionality across all pages and components.
   - Ensure the app respects system settings and persists user choice.

### Files to Modify or Create

- `tailwind.config.js`: Update for dark mode support.
- `src/app/layout.tsx`: Add theme toggle UI and logic.
- `src/components/ui/button.tsx`: Ensure dark mode compatibility.
- `src/lib/utils.ts`: Enhance `cn` utility if needed.
- Create a new context or utility for theme management.

### Libraries to Use

- Tailwind CSS (already integrated).
- `shadcn/ui` for UI components.

### Additional Considerations

- Ensure accessibility for the theme toggle button.
- Test on multiple browsers and devices.

## Development Notes

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

### Acceptance Criteria Status

- [x] Light and dark mode themes are available for the app and UI components
- [x] The app uses the user's system settings
- [x] The user can switch theme with a UI control
- [x] The user's choice is persisted in Local Storage
