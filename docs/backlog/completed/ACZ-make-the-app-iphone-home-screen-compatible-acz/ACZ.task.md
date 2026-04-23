---
taskId: ACZ
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-21T12:43:12+02:00
---

# Make the app iPhone home-screen compatible [acz]

Enable install to iPhone home screen (and basic PWA install elsewhere) with config-driven name and icon, integrated with our AppConfig and Next.js Metadata.

## Goals

- [ ] Allow users to “Add to Home Screen” on iOS Safari with proper icon and title
- [ ] Drive name, colors, and icons from AppConfig (no ad-hoc constants)
- [ ] Centralize PWA/iOS head tags in a reusable server component under `@/42go`
- [ ] Work seamlessly across both `(public)` and `(app)` route groups
- [ ] Provide a minimal Web App Manifest for non-iOS browsers (Android/Desktop)

## Acceptance Criteria

- [ ] If `config.public.pwa` is set, the page head includes:
  - `apple-mobile-web-app-capable=yes`
  - `apple-mobile-web-app-title` matching configured name
  - `link rel="apple-touch-icon"` for at least 180x180 PNG
  - Optional status bar style via `apple-mobile-web-app-status-bar-style`
- [ ] Next.js Metadata contains corresponding `appleWebApp`, `applicationName`, `icons`, `themeColor` based on `public.pwa` when provided
- [ ] A dynamic `/manifest.webmanifest` (or `app/manifest.ts`) exists and reflects `public.pwa` (name, short_name, theme_color, background_color, icons)
- [ ] Root layout includes the reusable PWA head component so both `(public)` and `(app)` routes inherit it
- [ ] iOS: “Add to Home Screen” shows correct app name and icon; launched app is standalone (no Safari chrome)
- [ ] Android/desktop: install prompt uses manifest values; icon and name match config
- [ ] No inference from `public.meta`; `public.pwa` must include duplicated values explicitly when needed

## Proposed Design

- Authoritative config: `config.public.pwa` (explicit, no inference from `public.meta`).
  - Even if values match, duplicate them here. We prefer clarity over magic.
- Next.js Metadata is derived from `public.pwa` when present (set `applicationName`, `themeColor`, `icons`, `appleWebApp`).
- Create `@/42go/pwa/HeadTags.tsx` (server component):
  - Reads `getAppConfig()`
  - Renders legacy iOS meta tags and `<link rel="apple-touch-icon">` fallbacks when not covered by Metadata
  - No client JS; SSR-only
- Manifest route: `src/app/manifest.ts` using `MetadataRoute.Manifest` and `getAppConfig()` to return dynamic manifest per app
- Icons: expect an absolute public path (e.g., `/images/icons/quicklist-180.png`). Provide a default fallback icon shipped in `/public/images/icons/default-180.png`. Document required sizes: at least 180x180 for iOS; 192x192 and 512x512 for manifest.
- Root integration: include `<HeadTags />` in `src/app/layout.tsx <head>` so it covers every route group.

### Config Schema (proposed)

```ts
public: {
  meta?: Partial<Metadata>;
  pwa?: {
    name: string;            // Full name
    shortName?: string;      // Manifest short_name
    description?: string;
    themeColor?: string;     // e.g. "#111827"
    backgroundColor?: string;// e.g. "#ffffff"
    statusBarStyle?: "default" | "black" | "black-translucent";
    display?: "standalone" | "fullscreen" | "minimal-ui" | "browser";
    scope?: string;          // default "/"
    startUrl?: string;       // default "/"
    icons: {
      appleTouch180: string; // required for iOS
      manifest192?: string;  // recommended for Android
      manifest512?: string;  // recommended for Android/desktop
      maskable512?: string;  // optional maskable icon
    };
  };
}
```

## Implementation Notes

- iOS still relies on `apple-touch-icon` and `apple-*` meta regardless of manifest; we’ll supply both.
- We won’t implement a Service Worker now (offline is out of scope). Installability on iOS does not require SW.
- Authoritative source is `config.public.pwa`. Do not infer from `public.meta`.

## Next Steps

- execute task (k3)

## Open Questions

- Where do we store per-app icons? Proposal: under `/public/images/icons/` with app-specific filenames referenced by config, not inferred by code.
- Do we want to infer `applicationName` from `config.name` when `public.meta.applicationName` is missing? Default: yes, safe.
- Should we fail build or warn when required icon size is missing? Default: warn at runtime (server log) and use default icon.

## Validation

- iOS Safari: open app → Share → Add to Home Screen. Verify name, icon, and standalone display.
- Android Chrome: Menu → Install App. Verify prompt uses manifest and correct icon/name.
- Lighthouse PWA audit (optional): ensure basic checks pass (manifest present, icons provided, installable).
