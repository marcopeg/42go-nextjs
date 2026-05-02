---
title: PWA Configuration
---

# PWA Configuration

Use `public.pwa` in an app config when an app should behave well after a user installs it to a phone home screen or desktop launcher.

The PWA config drives two runtime surfaces:

- `src/app/manifest.ts` generates the web app manifest.
- `src/42go/pwa/HeadTags.tsx` emits iOS home screen metadata and the Apple touch icon.

If `public.pwa` is missing, the app still renders normally in the browser, but it has no app-specific install metadata.

## Basic Example

For authenticated apps, set `startUrl` to the route users should see when launching the installed app.

```ts
const app = {
  name: "LingoCafe",
  public: {
    pwa: {
      name: "LingoCafe",
      shortName: "LingoCafe",
      description: "A focused language-learning app with simple sign-in.",
      themeColor: "light",
      backgroundColor: "light",
      startUrl: "/books",
      scope: "/",
      display: "standalone",
      icons: {
        appleTouch180: "/images/icons/default-180.png",
      },
    },
  },
  app: {
    default: {
      page: "/books",
    },
  },
};
```

In this example, the installed app opens at `/books`. Without `startUrl`, the manifest falls back to `/`, which can make an authenticated app reopen to a public home page even while the session is still valid.

## Options

`name` is the full app name used by install surfaces and iOS metadata.

`shortName` is the shorter label used by launchers when space is limited.

`description` is written to the manifest for install contexts that show app details.

`themeColor` controls the manifest theme color and Next.js viewport `themeColor`. It accepts `"light"`, `"dark"`, or a hex color such as `"#0f172a"`.

`backgroundColor` controls the manifest background color. It accepts the same values as `themeColor`.

`statusBarStyle` controls the iOS status bar style. Supported values are `"default"`, `"black"`, and `"black-translucent"`.

`display` controls the installed app display mode. Use `"standalone"` for a normal home screen app experience.

`scope` limits the navigation scope for the installed app. Most apps should use `"/"`.

`startUrl` controls the route opened when the installed app launches. If omitted, the manifest uses `"/"`.

`icons.appleTouch180` is the iOS home screen icon path. It should point to a 180x180 PNG in `public/`.

`icons.manifest192`, `icons.manifest512`, and `icons.maskable512` are optional manifest icons for Android and desktop install surfaces.

## Launch Behavior

For public apps, `startUrl: "/"` can be enough.

For authenticated apps, prefer the app entry route:

```ts
pwa: {
  startUrl: "/books",
  scope: "/",
  display: "standalone",
  icons: {
    appleTouch180: "/images/icons/default-180.png",
  },
}
```

This keeps the installed app aligned with `app.default.page` and avoids sending signed-in users back to a login-oriented public page.

## Icons

Real app icons should be added as static assets under `public/` and referenced with absolute public paths.

During early development, a placeholder icon path can keep the configuration shape in place. Before shipping, replace it with app-specific 180x180, 192x192, and 512x512 PNG assets.

## Manual iOS Check

1. Open the app in iOS Safari.
2. Add it to the Home Screen.
3. Launch the installed app and sign in.
4. Force-close it with the app switcher.
5. Relaunch it from the Home Screen.
6. Confirm it opens at the configured `startUrl` while the session remains valid.
