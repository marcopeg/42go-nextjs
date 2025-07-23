# App Config

`42Go Next` uses a **multi-app configuration** approach that lets you implement completely different SaaS from the same codebase by:

- use `Request` properties to match a specific config (like the url)
- apply **featureFlags** to enable different client routes and api endpoints

> All the configuration happens in `@/AppConfig.ts`

🔗 Are you looking for [Feature Flags](./FEATURE_FLAGS.md)?

## Available Apps

Define all your available apps' configuration in `availableApps`.

Each config item is completely independent and should match the `AppConfigItem` interface that is declared at the top of the file. Extend this interface as you need.

## Default App

You can optionally setup the `DEFAULT_APP` using the config key that you want to use if no match is returned from `matchAppName()` (see next section).

## Strict Mode

Setting `DEFAULT_APP` to `null` enables the **strict mode** where the app will return 404 for any page or api route in case no explicit match is found!

## Match the Current App

Implement your matching logic in `matchAppName(Request): Promise<AppName>`.

It's async and it should return one of the `availableApps` name (the object's key) or `null` in case no match is identified.

Here you have total freedom: use any `Request`'s property to run your match logic. The default implementation shows a possible match through the current url, or via a custom header.
