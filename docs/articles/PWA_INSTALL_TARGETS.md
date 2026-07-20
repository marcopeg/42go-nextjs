# PWA Install Targets

42Go can expose selected same-origin routes as distinct installable **virtual apps**. Each target keeps the current app's PWA defaults unless a server resolver overrides them dynamically.

Use this for resources such as lists, workspaces, dashboards, or projects that should have their own home-screen or desktop identity and launch URL.

## Architecture

The integration has two halves:

1. AppConfig declares serializable URL patterns and named resolver keys.
2. A server-only registry maps those keys to resolvers that may read sessions, authorization, and database data.

Database functions never enter the client-imported AppConfig object.

## AppConfig declaration

Add one or more targets under `public.pwa.targets`:

```typescript
public: {
  pwa: {
    id: "/quicklists",
    name: "QuickList",
    startUrl: "/quicklists",
    scope: "/",
    display: "standalone",
    targets: [
      {
        pattern: "/quicklists/:projectId/install",
        resolver: "quicklist-project",
        manifestPath: "/quicklists/:projectId/install",
      },
    ],
  },
}
```

The pattern grammar supports:

- literal path segments;
- named `:parameter` segments;
- an optional final `/**` that matches the canonical route and nested routes.

`manifestPath` is optional. It produces one stable manifest URL when several nested pages represent the same virtual app. Its parameters must be declared by `pattern`.

Equivalent pattern shapes are rejected as ambiguous. AppConfig declaration order is therefore not a hidden precedence mechanism.

## Server resolver

Register the resolver in `src/PWAInstallTargets.ts`:

```typescript
export const PWA_INSTALL_TARGET_RESOLVERS = {
  "quicklist-project": resolveQuicklistProjectInstallTarget,
} as const satisfies Record<string, TPWAInstallTargetResolver>;
```

The resolver receives the resolved AppID, matched pathname, and extracted parameters:

```typescript
export const resolveProjectInstallTarget: TPWAInstallTargetResolver = async ({
  appId,
  params,
}) => {
  const project = await loadAuthorizedProject({
    appId,
    projectId: params.projectId,
  });
  if (!project) return null;

  const startUrl = `/projects/${project.id}`;

  return {
    id: startUrl,
    name: project.title,
    shortName: project.title,
    startUrl,
    manifestPath: startUrl,
    private: true,
  };
};
```

Returning `null` means the target is unavailable. Page rendering falls back to the base app identity without leaking private metadata. An explicit dynamic manifest request returns 404.

## Dynamic fields and fallback

A resolver may override:

- stable `id`;
- `name` and `shortName`;
- `startUrl` and `scope`;
- description;
- display mode;
- theme/background/status-bar colors;
- favicon, Apple, manifest, and maskable icon URLs.

Unspecified fields inherit from the base app PWA and app icon configuration. Every URL and icon is validated as root-relative and same-origin. `startUrl` must remain inside `scope`.

Keep `id` stable across title, icon, color, and routing-presentation changes. Changing it creates a different browser application identity.

## Request and manifest flow

`src/proxy.ts` writes a trusted internal pathname after deleting any caller-supplied value. The 42Go PWA resolver combines that pathname with the request-resolved AppID.

The framework emits:

- one manifest link;
- one Apple touch icon;
- one Apple application title/capability set;
- resolved application name and colors.

The explicit `/manifest.webmanifest` route preserves the historical app manifest URL. Dynamic links add a canonical `path` query and `crossorigin="use-credentials"`. The query contains only the target path; all names, icons, colors, and authorization decisions come from the server resolver.

Private manifests return `Cache-Control: private, no-store`, `Vary: Cookie`, and 404 when authorization fails. Static app manifests keep public revalidation caching.

Browsers associate installation metadata with the loaded document. The framework therefore keeps the manifest selected during the initial server request fixed for that document's lifetime. App Router navigation does not replace it or trigger a reload.

When a resource needs a distinct virtual-app identity, give it a dedicated installer route and enter that route through an intentional full-document navigation. The installer document then receives the authorized target manifest as its initial server-rendered identity. Ordinary index, detail, and settings routes should keep the base manifest and use normal client navigation.

## Installation UI

Use the shared action on the dedicated installer page:

```tsx
<InstallAppAction
  appName={project.title}
  buttonLabel="Install this project"
/>
```

`PWAInstallProvider` is mounted globally by `Providers`. It captures Chromium's `beforeinstallprompt` event before page navigation can lose it.

The action that enters the installer page must use a native anchor or equivalent document navigation. Do not use `next/link` or `router.push()` for that one transition. Links among ordinary application pages remain client-side.

When a native prompt is unavailable, `InstallAppAction` uses the shared 42Go Modal to show platform instructions. iOS/iPadOS and macOS Safari remain manual flows. Standalone display mode is not treated as evidence that a particular virtual app is installed.

There is no cross-browser installed-target inventory. Do not persist an authoritative `installed` flag.

## Installed-target UI context

Standalone display mode alone cannot identify a virtual app because the base app can also be installed. When product UI needs target-specific chrome, keep the manifest `id` stable and add an exact target marker only to `startUrl`:

```tsx
const targetId = `/projects/${project.id}`;

return {
  id: targetId,
  startUrl: createPWAInstallTargetStartUrl({
    startUrl: targetId,
    targetId,
  }),
};
```

On the target page, combine standalone detection with the exact launch target:

```tsx
const isInstalledProjectApp = useIsInstalledPWAInstallTarget(targetId);

<AppLayout
  backBtn={isInstalledProjectApp ? undefined : { to: "/projects" }}
>
  {/* project UI */}
</AppLayout>
```

The hook records the exact launch marker in `sessionStorage` so target-specific UI remains consistent while navigating to nested routes in the current installed-app session. The marker is UX context only. It must never grant access, select a tenant, or replace server authorization. Installed copies created before a marked `startUrl` was deployed may need to be removed and reinstalled.

Use the same hook to omit an install action that would reinstall the current target. Keep the action in ordinary browser and base-app contexts if those contexts are allowed to create a separate virtual-app install.

### Installed launcher names are not readable

The manifest `name` and `short_name` values are developer-provided installation inputs. A browser may let the user replace that label during installation, but no standard web API reflects the resulting OS launcher name into the running document. WebKit documents that iOS combines the user-edited name with Manifest ID internally, and Chromium's installed-related-app API exposes identity and URL metadata without the installed label.

Do not claim that an in-app heading represents the native launcher label. If a product needs a synchronized custom heading, collect an app-owned display name before installation, persist it under normal authorization, and use the same value in both the resolved manifest and application UI. Later edits made only in the OS installation interface will still be invisible to the web app.

References: [W3C Web Application Manifest](https://www.w3.org/TR/appmanifest/#application-s-name), [WebKit on iOS Home Screen names and Manifest ID](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/#manifest-id), and [Chrome Get Installed Related Apps](https://developer.chrome.com/docs/capabilities/get-installed-related-apps).

## Security rules

- Installing a target never grants access.
- Resolve sessions and resource authorization on the server.
- Protect the target route normally on every launch.
- Return 404 for invalid, cross-app, deleted, or unauthorized resources.
- Never accept names, colors, icons, scopes, or redirects from manifest query parameters.
- Do not use `scope`, UUID secrecy, or the manifest URL as authorization.
- Do not place database-aware resolver functions directly in AppConfig.
