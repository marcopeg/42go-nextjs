# Feature Flags

Your App supports **Feature Flags** for both App and API routes using HOC from the `@/lib/config/app-config-*` libraries.

## Available Flags

Edit your `@/AppConfig.ts` file and setup explicit whitelists for each App's config object:

```js
export const availableApps = {
  default: {
    featureFlags: {
      pages: ["flag1", "flag2"],
      apis: ["flag3", "flag4"],
    },
  },
};
```

## Passthrough Flag

If you are running a single app you may do not need to whitelist every single feature you do. Use the `*` flag to enable them all:

```js
export const availableApps = {
  default: {
    featureFlags: {
      pages: ["*"],
      apis: ["*"],
    },
  },
};
```

## Apply Feature Flag Protection

🔥 By default NextJS **DOES NOT PROTECT** pages nor API routes. 🔥

This is an opt-in activity that you have to do by applying HOC to your pages' components and routes' handlers.

### Protect a Page

Apply the `pageWithConfig()` HOC from `@/lib/config/app-config-pages.tsx`:

```tsx
import { type AppConfig, pageWithConfig } from "@/lib/config/app-config-pages";

const TodosPage = ({ config }: { config: AppConfig }) => (
  <div>{config.name}</div>
);

export default pageWithConfig(TodosPage);
```

### Protect a Route

Apply the `routeWithConfig()` HOC from `@/lib/config/app-config.ts`:

```ts
import { typeAppConfig, routeWithConfig } from "@/lib/config/app-config";

const getTodos = async (config: AppConfig) => {
  return Response.json({ success: true });
};

export const GET = routeWithConfig(getTodos);
```

### Config-Based Protection

Both HOCs will try to get the current App's config and will automatically kill the request with a 404 in case no configuration is provided.

> This happens when the configuration match is set to [**strict mode**](./APP_CONFIG.md#strict-mode).

### Custom Flag Name

By default both HOC will use the function's name (Component or handler) as flag name to check against the config's available flags.

You can customize this by providing an explicit flag name:

```ts
// For a page:
export default appPage(TodosPage, "todos:page");

// For a route:
export const GET = appRoute(getTodos, "todos:list");
```

### Passthrough Flag

If you need to mark a page or route as globally available use the `*` flag name to force-skip the control:

```ts
// For a page:
export default appPage(TodosPage, "*");

// For a route:
export const GET = appRoute(getTodos, "*");
```
