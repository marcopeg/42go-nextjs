# Support default theme in App config

Right now the theme defaults to the system preferences unless the user changes it. In such a case, the preference it is stored in the Local Storage.

The goal is to optionally expose a `theme.default` property in each App's config that sets the default theme to use if no Local Storage preference is available.

If no information is available, then the browser's setting should be used.

# Acceptance Criteria

- [ ] If the matched app exposes `theme.default` then this value is used as the active theme
- [ ] If the local storage contains a prefecence, such information is used as the active theme
- [ ] If no information is available, the browser's settings is used as the active theme

# Notes

The full typing for the `theme` and `theme.default` app config properties should be added to `src/AppConfig.ts`.

Both `theme.default` and even the whole `theme` should be optional configuration settings.

## Development Plan

Listen up, partner! I'm about to lay down a plan so solid that even Chuck Norris would nod in approval. We need to implement default theme support in the App config, and here's how we're gonna kick this task into submission:

### **Current State Analysis**

- We have a robust theme system using `next-themes` with ThemeProvider
- Current theme defaults to "system" (browser preference)
- Theme selection is stored in localStorage when user makes a choice
- AppConfig system is fully functional with dynamic configuration per app
- No theme configuration exists in AppConfig interface yet

### **Implementation Strategy**

#### **Step 1: Extend AppConfig Interface**

- Add optional `theme` property to `AppConfigItem` interface in `src/AppConfig.ts`
- Include `default` property within theme config
- Support theme values: `"light"`, `"dark"`, `"system"`

#### **Step 2: Update App Configurations**

- Add theme.default configuration to sample apps in the `availableApps` object
- Demonstrate different default themes per app

#### **Step 3: Enhance ThemeProvider**

- Modify `src/lib/config/ThemeProvider.tsx` to directly read AppConfig for theme.default
- Use the existing `useAppConfig` hook to access app configuration
- Determine the correct defaultTheme based on app config before initializing NextThemesProvider
- Maintain backward compatibility and proper fallback logic

### **Files to Modify/Create**

1. **`src/AppConfig.ts`**

   - Extend `AppConfigItem` interface with optional `theme` property
   - Add theme configurations to sample apps

2. **`src/lib/config/ThemeProvider.tsx`**

   - Enhance to read AppConfig directly using `useAppConfig` hook
   - Determine appropriate defaultTheme from app.theme.default or fallback to "system"
   - Maintain existing functionality while adding app-config integration

### **Acceptance Criteria Verification**

- ✅ App config `theme.default` value used when no localStorage preference
- ✅ localStorage preference takes precedence over app default
- ✅ Browser settings used as final fallback
- ✅ Fully typed TypeScript implementation
- ✅ Backward compatibility maintained

### **Technical Considerations**

- Proper SSR handling to prevent hydration mismatches
- Type safety throughout the theme configuration chain
- Performance optimization - no unnecessary re-renders
- Clean separation of concerns between AppConfig and theme management

This plan is tougher than a two-dollar steak and more reliable than Chuck Norris's roundhouse kick!
