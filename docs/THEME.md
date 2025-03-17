# Theme Customization Guide

This document explains how to customize the theme of your application, particularly focusing on accent colors and theme modes.

## Table of Contents

- [Accent Colors](#accent-colors)
  - [Available Accent Colors](#available-accent-colors)
  - [Setting a Permanent Accent Color](#setting-a-permanent-accent-color)
  - [Disabling the Accent Color Picker](#disabling-the-accent-color-picker)
  - [Adding New Accent Colors](#adding-new-accent-colors)
- [Dark/Light Mode](#darklight-mode)
  - [Setting a Default Theme](#setting-a-default-theme)
  - [Disabling Theme Switching](#disabling-theme-switching)
- [Examples](#examples)

## Accent Colors

The application uses a flexible accent color system that allows for easy customization. By default, the application comes with an orange accent color and a color picker that allows users to change it.

### Available Accent Colors

The following accent colors are available out of the box:

- Orange (default): `24 95% 50%`
- Blue: `221 83% 53%`
- Green: `142 71% 45%`
- Purple: `262 83% 58%`
- Pink: `330 81% 60%`
- Red: `0 84% 60%`

These colors are defined in HSL format (Hue, Saturation, Lightness) in the `src/lib/theme-config.ts` file.

### Setting a Permanent Accent Color

If you want to set a permanent accent color for your application and remove the ability for users to change it, follow these steps:

1. **Modify the theme-config.ts file**

   Open `src/lib/theme-config.ts` and change the default accent color by modifying the `defaultAccentColor` export:

   ```typescript
   // To set blue as the permanent accent color:
   export const defaultAccentColor = accentColors[1]; // Blue is at index 1
   ```

   Alternatively, you can create a custom accent color:

   ```typescript
   // To set a custom accent color:
   export const defaultAccentColor: AccentColor = {
     name: 'custom',
     value: '200 100% 50%', // Your custom HSL value
     foreground: '0 0% 100%', // Text color on this background
   };
   ```

2. **Modify the accent-color-provider.tsx file**

   To make the accent color permanent and prevent it from being changed, modify `src/components/accent-color-provider.tsx`:

   ```typescript
   export function AccentColorProvider({ children }: { children: React.ReactNode }) {
     // Use defaultAccentColor directly instead of state
     const accentColor = defaultAccentColor;

     // Apply the accent color to CSS variables
     useEffect(() => {
       document.documentElement.style.setProperty('--accent', accentColor.value);
       document.documentElement.style.setProperty('--accent-foreground', accentColor.foreground);
       document.documentElement.style.setProperty('--ring', accentColor.value);
     }, []); // Only run once on mount

     return (
       <AccentColorContext.Provider
         value={{
           accentColor,
           setAccentColor: () => {}, // No-op function
           availableColors: [accentColor], // Only include the default color
         }}
       >
         {children}
       </AccentColorContext.Provider>
     );
   }
   ```

   See a complete example in [docs/examples/permanent-accent-color.tsx](./examples/permanent-accent-color.tsx).

3. **Update globals.css (Optional)**

   For better performance, you can also hardcode the accent color values directly in `src/app/globals.css`:

   ```css
   @layer base {
     :root {
       /* Other variables... */
       --accent: 221 83% 53%; /* Blue accent color */
       --accent-foreground: 0 0% 100%;
       --ring: 221 83% 53%;
     }

     .dark {
       /* Other variables... */
       --accent: 221 83% 53%; /* Blue accent color */
       --accent-foreground: 0 0% 100%;
       --ring: 221 83% 53%;
     }
   }
   ```

   See a complete example in [docs/examples/hardcoded-globals.css](./examples/hardcoded-globals.css).

### Disabling the Accent Color Picker

To completely remove the accent color picker from your application:

1. **Remove the AccentColorPicker from pages**

   Open any page files that include the `AccentColorPicker` component (like `src/app/page.tsx`) and remove it:

   ```typescript
   // Before
   <div className="absolute top-4 right-4 flex gap-2">
     <AccentColorPicker />
     <ThemeToggle />
   </div>

   // After
   <div className="absolute top-4 right-4">
     <ThemeToggle />
   </div>
   ```

   See a complete example in [docs/examples/simplified-page.tsx](./examples/simplified-page.tsx).

2. **Simplify the AccentColorProvider (Optional)**

   If you're not using the accent color picker anywhere in your application, you can simplify the `AccentColorProvider` as shown in the previous section.

### Adding New Accent Colors

To add new accent colors to the palette:

1. Open `src/lib/theme-config.ts`
2. Add your new color to the `accentColors` array:

   ```typescript
   export const accentColors: AccentColor[] = [
     // Existing colors...
     {
       name: 'teal',
       value: '180 100% 30%',
       foreground: '0 0% 100%',
     },
   ];
   ```

## Dark/Light Mode

The application uses the `next-themes` library to manage dark and light mode.

### Setting a Default Theme

To change the default theme, modify the `ThemeProvider` in `src/app/layout.tsx`:

```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="dark" // Change to "light", "dark", or "system"
  enableSystem
>
  {/* ... */}
</ThemeProvider>
```

### Disabling Theme Switching

If you want to disable theme switching and use a fixed theme:

1. **Remove the ThemeToggle from pages**

   Open any page files that include the `ThemeToggle` component and remove it.

2. **Modify the ThemeProvider**

   In `src/app/layout.tsx`, modify the `ThemeProvider` to disable system theme and force a specific theme:

   ```typescript
   <ThemeProvider
     attribute="class"
     defaultTheme="dark" // Or "light"
     enableSystem={false} // Disable system theme
     forcedTheme="dark" // Force a specific theme
   >
     {/* ... */}
   </ThemeProvider>
   ```

3. **Remove unused components (Optional)**

   If you're completely disabling theme switching, you can remove the `ThemeToggle.tsx` component and simplify your codebase.

## Examples

Complete examples are provided in the `docs/examples` directory:

- [permanent-accent-color.tsx](./examples/permanent-accent-color.tsx) - A simplified AccentColorProvider with a permanent accent color
- [simplified-page.tsx](./examples/simplified-page.tsx) - A page without the accent color picker
- [hardcoded-globals.css](./examples/hardcoded-globals.css) - CSS file with hardcoded accent colors
