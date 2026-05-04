---
title: App Themes
---

# App Themes

Use `public/app-themes` to give each configured app its own CSS token overrides.

The theme system follows the same app-folder convention as app icons. Most apps only need a folder named after the AppID with a `style.css` file inside it:

```text
public/app-themes/<app-id>/
  style.css
```

The boilerplate fallback lives in:

```text
public/app-themes/_default/
  style.css
```

The root layout loads `_default/style.css` first. It then loads `<app-id>/style.css` only when that file exists in the generated registry. Missing app-specific theme files are normal fallback behavior and do not create stylesheet 404s.

## Why Folders

Each app theme owns a folder so future assets can live beside `style.css`, such as local fonts, images, or other CSS-adjacent files.

```text
public/app-themes/acme/
  style.css
  fonts/
    brand.woff2
```

## Token Overrides

Override values from `src/app/tokens.css`:

```css
:root {
  --primary: oklch(69.512% 0.20285 41.616);
}

.dark {
  --primary: oklch(74% 0.19 41.616);
}
```

The `theme.default` AppConfig field still controls the initial light, dark, or system preference through `next-themes`. App theme stylesheets only provide app-specific token overrides.

## Validation

`scripts/generate-app-themes-registry.mjs` runs before the production build. It fails when `public/app-themes/_default/style.css` is missing and records which app folders contain `style.css`.
