# Multi App

_42Go-Next_ let you work on multiple apps from a modular monolithic codebase.

Just think about it:

- one single set of dependencies to maintain
- shared visual components
- shared modules and functionalities

This is how _42Go-Next_ empowers serial **SaaS Creators** into never stop trying to figure out the next successful project.

## @/AppConfig.ts

We use the name _App_ to mean a set of functionalities that are offered to the end user under an dedicated _User Experience_.

The file `@/AppConfig.ts` exports `const apps` that is a _key/value_ store of Apps that can be served by the codebase.

> An _App_ configuration is an object of type `AppConfigItem` and you can check this type out in the codebase to figure out the complete list of parameters (TODO: provide the deeplink to the type's source)

```ts
// Basic Configuration
export const apps: Record<string, AppConfigItem> = {
  app1: {
    name: "First App",
  },
  app2: {
    name: "Second App",
  },
};
```

## Config Matchers

The first think you want to setup is the App's matcher, the rule(s) that are used by the system to figure out which configuration to use to satisfy the incoming request.

> You will work mostly at configuration level, but be aware that you can throw all of this away and implement your own custom logic in `@/middleware.ts`

The order of application is specific, and the first positive match will stop the process:

1. Environment
2. Headers
3. URL

### env.APP_ID

Provide a specific `APP_ID=todo` as _Environment Variable_ at boot time to lock down the execution to that specific App only.

> No other apps will be available to this running process!

👉 This is particularly useful when you want to work on multiple apps from the same codebase, but then you deploy each one (or groups of them) independently for scaling reasons.

### match.header

This setting works by matching the request's headers against one or more rules that can be either exact matches or regular expressions.

> You can use regular expressions for both the `key` and the `value`.

```ts
const app: AppConfigItem = {
  match: {
    header: {
      mode: "all", // default "any"
      keys: [
        {
          key: "X-Name",
          value: "foobar",
        },
        {
          key: "X-Foo",
          value: "^abc$",
        },
      ],
    },
  },
};
```

### match.url

This setting works by matching the URL of the request against one or more _regular expressions_. If any of the rules is a match, then the configuration is used.

```ts
// Match the url from the incoming request
const app: AppConfigItem = {
	match: {
		url: ["^localhost:3000$", ...other options ]
	}
}
```

> The first hit will stop the search setting the AppID as active.

### Custom Match Logic

If these functionalities are not enough, you can modify the `@/middleware.ts` and implement whatever _Request_ matching logic that you need to put in place to pick the active _App_ configuration.

Just make sure you forward the final value as internal header:

```ts
const requestHeaders = new Headers(request.headers);
requestHeaders.set(APP_HEADER_NAME, "-- your choiche goes here --");
```

### Default App

If the matching fails to identify the correct AppID to use during the request, the control passes to the `export const DEFAULT_APP` from `@/AppConfig.ts`.

- `null` will cause a `404 app not found`
- `{app-id}` will force that specific App to be used when no match was possible

> We suggest to keep this to `null` and be explicit with the matching configuration!

## Feature Flags

_42Go-Next_ considers each route a _feature_ that may or may not be available to any given _App_ configuration.

In classic NextJS you exposes pages as `@/app/foobar/page.tsx` and APIs as `@/app/api/foobar/route.ts`.

If you look at this from the entire codebase perspective, those are just 2 different features. You may have tens or hundreds of such features in your codebase. But it is not a given that every _App_ needs all the features. Quite the opposite.

Usually, each _App_ has some specific and unique features (btw, it's called Unique Selling Proposition), plus some common ones like the signup/login, user profile management, maybe a contact form.

### Whitelist Model

By default a _42Go-Next_ App has no features whatsoever.

> You must explicitly whitelist every single feature that you want to use in any given app.

```ts
// Enable features for an App (unified list)
const app: AppConfigItem = {
  features: ["page:page1", "page:page2", "api:route1", "api:route2"],
};
```

### FeatureID

The value to use for each FeatureID is defined by the relative `page.tsx` or `route.ts` in the `export default` part:

```tsx
// src/app/(app)/todos/page.tsx
import { protectPage } from "@/42go/auth/protectPage";

const TodosPage = () => "todos page...";

// Feature can be inferred from first segment (todos) OR specified explicitly:
export default protectPage(TodosPage, {
  require: { auth: true, feature: "page:todos" },
});
```

## Theming

_42Go-Next_ is based on [TailwindCSS] and [ChadCN] and supports Light and Dark theme out of the box.

Styling is achieved by 2 main files in your project:

- `@/app/tokens.css` sets up all the [Design Tokens]
- `@/app/tailwind.css` connects your tokens to Tailwind

> Whatever change you apply to these files will impact every App.

### Default Theme

You can control what theme is used at boot time by changing the following setting:

```ts
const app: AppConfigItem = {
  theme: {
    default: "light", // light | dark | system (default: system)
  },
};
```

### Override Tokens

You probably want to give your App a specific branding and visual identity.

You can create a `@/public/themes/{app-id}.css` and override any token to customize, say, your primary color:

```css
/* 
@/public/themes/todo.css 
(AppID: todo)
*/
:root {
  --primary: oklch(69.512% 0.20285 41.616);
}
```

### PublicLayout

All the public pages should be implemented under `@/app/(public)`

### AppLayout
