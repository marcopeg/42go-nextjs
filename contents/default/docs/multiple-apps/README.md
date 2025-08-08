# Multi App

*42Go-Next* let you work on multiple apps from a modular monolithic codebase. 

Just think about it:
- one single set of dependencies to maintain
- shared visual components
- shared modules and functionalities

This is how *42Go-Next* empowers serial **SaaS Creators** into never stop trying to figure out the next successful project.

## @/AppConfig.ts

We use the name *App* to mean a set of functionalities that are offered to the end user under an dedicated *User Experience*. 

The file `@/AppConfig.ts` exports `const apps` that is a *key/value* store of Apps that can be served by the codebase.

> An *App* configuration is an object of type `AppConfigItem` and you can check this type out in the codebase to figure out the complete list of parameters (TODO: provide the deeplink to the type's source)

```ts
// Basic Configuration
export const apps: Record<string, AppConfigItem> = {
	app1: {
		name: "First App"
	},
	app2: {
		name: "Second App"
	}
}
```

## Config Matchers

The first think you want to setup is the App's matcher, the rule(s) that are used by the system to figure out which configuration to use to satisfy the incoming request.
### match.url

This setting works by matching the url of the request against one or more _regular expressions_. If any of the rules is a match, then the configuration is used.

```ts
// Match the url from the incoming request
const app: AppConfigItem = {
	match: {
		url: ["^localhost:3000$", ...other options ]
	}
}
```

### match.header

This setting works by matching the request's headers against one or more rules that can be either exact matches or regular expressions. 

> You can use regular expressions for both the `key` and the `value`.

```ts
const app: AppConfigItem = {
	match: {
		header: {
			mode: 'all', // default "any"
			keys: [
				{
					key: 'X-Name',
					value: 'foobar'
				},
				{
					key: 'X-Foo',
					value: "^abc$"
				}
			]
		}
	}
}
```

### Custom Match Logic
If these functionalities are not enough, you can modify the `@/middleware.ts` and implement whatever _Request_ matching logic that you need to put in place to pick the active _App_ configuration.

Just make sure you forward the final value as internal header:

```ts
const requestHeaders = new Headers(request.headers);
requestHeaders.set(APP_HEADER_NAME, '-- your choiche goes here --');
```

## Feature Flags

_42Go-Next_ considers each route a _feature_ that may or may not be available to any given _App_ configuration.

In classic NextJS you exposes pages as `@/app/foobar/page.tsx` and APIs as `@/app/api/foobar/route.ts`. 

If you look at this from the entire codebase perspective, those are just 2 different features. You may have tens or hundreds of such features in your codebase. But it is not a given that every _App_ needs all the features. Quite the opposite.

Usually, each _App_ has some specific and unique features (btw, it's called Unique Selling Proposition), plus some common ones like the signup/login, user profile management, maybe a contact form.
### Whitelist Model

By default a _42Go-Next_ App has no features whatsoever.

> You must explicitly whitelist every single feature that you want to use in any given app.

```ts
// Enable features for an App
const app: AppConfigItem = {
	featureFlags: {
		pages: ["page1", "page2"],
		apis: ["route1", "route2"],
	},
}
```

### FeatureID

The value to use for each FeatureID is defined by the relative `page.tsx` or `route.ts` in the `export default` part:

```ts
// Define a React component that will render the page:
const TodosPage = () => 'todos page...'

// "todos" is the FeatureID:
export default appPage(TodosPage, "todos");
```