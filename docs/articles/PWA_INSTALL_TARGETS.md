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
        pattern: "/quicklists/:projectId/**",
        resolver: "quicklist-project",
        manifestPath: "/quicklists/:projectId",
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

Browsers associate installation metadata with the loaded document. When App Router client navigation crosses from the base app into a virtual app, or between two virtual apps, 42Go performs one full-document reload. Navigation inside the same virtual app remains client-side. The reload makes the server-resolved manifest primary for Safari and Chromium instead of relying on a mutated head link.

## Installation UI

Use the shared action inside a client component:

```tsx
<InstallAppAction
  appName={project.title}
  buttonLabel="Install this project"
/>
```

`PWAInstallProvider` is mounted globally by `Providers`. It captures Chromium's `beforeinstallprompt` event before page navigation can lose it.

When a native prompt is unavailable, `InstallAppAction` uses the shared 42Go Modal to show platform instructions. iOS/iPadOS and macOS Safari remain manual flows. Standalone display mode is not treated as evidence that a particular virtual app is installed.

There is no cross-browser installed-target inventory. Do not persist an authoritative `installed` flag.

## Security rules

- Installing a target never grants access.
- Resolve sessions and resource authorization on the server.
- Protect the target route normally on every launch.
- Return 404 for invalid, cross-app, deleted, or unauthorized resources.
- Never accept names, colors, icons, scopes, or redirects from manifest query parameters.
- Do not use `scope`, UUID secrecy, or the manifest URL as authorization.
- Do not place database-aware resolver functions directly in AppConfig.
