# Support different public layout based on App-config [aaac]

The idea is to allow the AppConfig to define a `theme.PublicLayout` that references an imported layout component and defaults to the `components/PublicLayout`.

Then in the public layout (`src/app/(public)/layout.tsx`) we need to access the configuration, use the component from `theme.PublicLayout` or fallback on `components/PublicLayout` - I guess this logic belongs here.

## Development Plan

_adjusts imaginary cowboy hat_

Alright partner, here's how we're gonna tackle this faster than Chuck Norris can solve world hunger (which he already did, but he's keeping it a secret):

### 🎯 **Objective**

Enable the AppConfig to define custom public layout components that can be dynamically loaded based on the current app configuration, with a fallback to the default PublicLayout.

### 📋 **Steps to Complete**

1. **Extend AppConfig Interface**

   - Add `theme.PublicLayout` property to support custom layout component references
   - This will be a string reference that maps to `src/components/{PublicLayout}`

2. **Create Dynamic Layout Component Resolver**

   - Build a utility function that can import layout components from `src/components/{layoutName}`
   - Handle fallback to default PublicLayout when custom layout is not found
   - Ensure proper TypeScript typing for layout components

3. **Update Public Route Layout**

   - Modify `src/app/(public)/layout.tsx` to use the app config system
   - Implement dynamic layout resolution based on `theme.PublicLayout` setting
   - Maintain backward compatibility with existing PublicLayout

4. **Create Example Custom Layout**

   - Create a custom layout component for app1 only
   - Design it as a narrow centered column layout for testing purposes
   - Keep app2 and default using the existing PublicLayout

5. **Update AppConfig Configuration**

   - Add `theme.PublicLayout` setting only to app1 configuration
   - Leave app2 and default unchanged to test fallback behavior

6. **Test and Validate**
   - Ensure app1 uses the custom narrow layout
   - Verify app2 and default continue using the standard PublicLayout (fallback behavior)
   - Test with different app configurations and hostnames

### 🔧 **Files to Modify/Create**

**Modify:**

- `src/AppConfig.ts` - Add PublicLayout property to AppConfigItem interface
- `src/app/(public)/layout.tsx` - Implement dynamic layout resolution

**Create:**

- `src/components/App1PublicLayout/index.tsx` - Custom narrow centered layout for app1
- `src/lib/config/layout-resolver.ts` - Utility for dynamic layout resolution

### 🎨 **Design Considerations**

- **Performance**: Use direct component imports to avoid loading all layouts in every app
- **Type Safety**: Ensure all custom layouts implement the same interface as PublicLayout
- **Fallback Strategy**: Graceful fallback to default PublicLayout if custom layout is not specified
- **Developer Experience**: Clear naming convention for custom layout components
- **Clean Architecture**: Custom layouts are siblings to PublicLayout, not children

### 🚀 **Expected Outcome**

After completion, the layout system will work as follows:

- `app1.localhost` will use a custom narrow centered column layout (for testing)
- `app2.localhost` will continue using the standard PublicLayout (fallback behavior)
- `localhost` (default app) will continue using the existing PublicLayout
- The system demonstrates both custom layout usage and proper fallback mechanism

This focused implementation will be as precise as Chuck Norris throwing a toothpick! 🥋

## Completion Summary

I roundhouse-kicked this task into submission. Here's the damage report:

- **`src/AppConfig.ts`**: I taught this file a lesson in flexibility. It now accepts a `theme.PublicLayout` property, which is a direct React component reference. For `app1`, I assigned a new `App1PublicLayout` component. No dynamic import nonsense, just pure, unadulterated type-safe power.
- **`src/components/App1PublicLayout/index.tsx`**: I created this file with my bare hands. It's a simple, narrow, centered layout for `app1`, proving that different apps can have different faces. It's lean, mean, and does its job without complaining.
- **`src/app/(public)/layout.tsx`**: I stared at this file until it surrendered. It now intelligently loads the layout component from the app config. If an app doesn't specify a custom layout, it wisely falls back to the default `PublicLayout`. It knows what's good for it.
- **`src/lib/config/layout-resolver.ts`**: This file was a mistake. It was thinking about using dynamic imports, which is a path to weakness. I deleted it. It won't be missed.
- **`docs/THEMING.md`**: I wrote down the law. This file now explains how to use the new custom public layout feature, so there are no excuses for not understanding it.
- **Lint & Build**: I ran `npm run lint && npm run build`. They passed. Of course, they did.

The task is done. The code is clean. The feature is solid. As it should be.
