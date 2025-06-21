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

## Meta Tags Customization

Each app configuration can include custom metadata that will be applied to the HTML `<head>` section dynamically.

### Adding Meta Tags to Your App Config

Extend your app configuration with a `meta` section:

```typescript
export const availableApps = {
  myapp: {
    name: "My Awesome App",
    featureFlags: {
      pages: ["*"],
      apis: ["*"],
    },
    meta: {
      title: "My Awesome App - The Best SaaS Ever",
      description: "Transform your business with our revolutionary platform",
      keywords: ["saas", "business", "productivity"],
      authors: [{ name: "Your Company", url: "https://yourcompany.com" }],
      openGraph: {
        title: "My Awesome App",
        description: "Transform your business with our revolutionary platform",
        images: [{ url: "/og-image.jpg" }],
      },
    },
  },
} satisfies Record<string, AppConfigItem>;
```

### Supported Meta Fields

The `meta` field accepts any valid Next.js `Metadata` object properties:

- **Basic SEO**: `title`, `description`, `keywords`
- **Authors**: `authors` array with name and optional URL
- **Open Graph**: `openGraph` object for social media sharing
- **Twitter Cards**: `twitter` object for Twitter-specific metadata
- **Robots**: `robots` for search engine crawling instructions
- **And many more** - see [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

### How It Works

1. **Dynamic Generation**: The main layout uses `generateMetadata()` to fetch app-specific metadata
2. **Automatic Merging**: App-specific metadata is merged with fallback values
3. **SSR Support**: Metadata is generated server-side for optimal SEO
4. **Type Safety**: Full TypeScript support using Next.js `Metadata` types

### Fallback Behavior

- **With App Config**: Shows app-specific metadata
- **Without Meta Section**: Uses empty object (no custom metadata)
- **No App Found**: Shows simplified layout (404 scenario)

This approach ensures each app in your multi-tenant setup has its own distinct SEO identity!
