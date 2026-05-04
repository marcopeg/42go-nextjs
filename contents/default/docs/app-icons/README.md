---
title: App Icons
---

# App Icons

Use `public/app-icons` to give each configured app its own browser favicon, Apple touch icon, manifest icons, maskable icon, and main UI icon.

The icon system is convention-first. Most apps only need files in a folder named after the AppID:

```text
public/app-icons/<app-id>/
  favicon.ico
  favicon-16x16.png
  favicon-32x32.png
  apple-touch-icon-180x180.png
  manifest-192x192.png
  manifest-512x512.png
  maskable-512x512.png
  ui.png
```

The boilerplate fallback lives in:

```text
public/app-icons/_default/
```

If an app-specific asset is missing, 42go falls back to the matching `_default` asset. Missing app-specific files do not create request-time filesystem checks.

## App Config

Most apps can rely on the convention and do not need an `icons` block.

Use `icons` only for strict validation or explicit overrides:

```ts
const app = {
  name: "My App",
  icons: {
    strict: true,
  },
};
```

```ts
const app = {
  name: "My App",
  icons: {
    basePath: "/app-icons/custom-folder",
    ui: "/app-icons/custom-folder/ui.png",
  },
};
```

`public.toolbar.icon` remains the highest-priority override for the toolbar/app-title surface only. It does not change favicons or manifest icons.

## Asset Matrix

`favicon.ico` is the classic browser fallback.

`favicon-16x16.png` and `favicon-32x32.png` are browser tab PNG variants.

`apple-touch-icon-180x180.png` is used by iOS home-screen surfaces.

`manifest-192x192.png` and `manifest-512x512.png` are used in the web app manifest.

`maskable-512x512.png` is used as the manifest maskable icon. Do not crop a normal icon into this shape unless it has a safe area.

`ui.png` is the default image used by public and protected app title components.

## Validation

The `_default` iconset must be complete. The build fails if a required default asset is missing.

App-specific iconsets may be partial. Missing app assets fall back to `_default` unless strict validation is enabled.

Use `icons.strict: true` to fail validation for a single app.

Use `APP_ICONS_STRICT=1` to fail validation for all missing app-specific assets.
