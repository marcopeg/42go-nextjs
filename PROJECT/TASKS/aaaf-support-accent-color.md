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

## Implementation

- Introduced optional theme sheets in `public/themes/`, e.g. `public/themes/app2.css` (or `global-app2.css`), containing only the CSS vars overrides like:
  ```css
  /* BEGIN App2 override */
  :root {
    --background: red;
  }
  .dark {
    --background: red;
  }
  /* END App2 override */
  ```
- Updated `InjectAppName` (`src/lib/config/InjectAppName.tsx`) to emit a `<link rel="stylesheet" href={`/themes/${name}.css`} />` when `name !== 'default'`:
  ```tsx
  {
    name && name !== "default" && (
      <link
        rel="stylesheet"
        href={`/themes/${name}.css`}
        onError={(e) => (e.currentTarget as HTMLLinkElement).remove()}
      />
    );
  }
  ```
  - The `onError` handler removes the `<link>` if the file does not exist, falling back to the base `globals.css`.
- No changes to the existing `globals.css` or build pipeline were required—purely CSS cascade and runtime `<link>` injection.

## Testing Notes

- Verified that visiting `app2.localhost:3000` or sending `X-App-Name: app2` header applies the red background.
- Confirmed that missing theme CSS (e.g. for apps without an override file) falls back gracefully to `globals.css` defaults.

_Next step_: implement a CSS-only “base color” variable (`--accent-base`) and use native CSS `color-contrast()` or PostCSS plugins to auto-generate tints and contrast colors.
