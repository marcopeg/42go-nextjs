# Remove middleware [aaw]

I want to remove the `@/middleware.ts` from the codebase.

**CURRENT SITUATION:**
It's only purpose is to identify an appID from the incoming request.
It adds it into the request's headers so that it is later read by "getAppID()".

**PROPOSED REFACTORING:**
This can be performed autonomously by the `@/42go/config/app-config.ts` getAppID() that can access the headers and run the matchers that are used today by the middleware.

These 2 lines read from the custom header that was set by the middleware:

```ts
// @/42go/config/app-config.ts
const headerList = await getHeaders();
const appIDHeader = headerList.get(APP_ID_HEADER);
```

Instead, here we should use the matcing logic that we find in `@/42go/lib/app-id/index.ts` and match by:

- environment
- header patterns
- url

It looks like to me that the current matchers logic relies entirely on the headers that can be fetched with `const header = await getHeaders()`.

This would make `getAppID()` a completely self-sufficient backend method that analyzes the headers to provide a match.

**OPTIMIZATION:**
If would be fantastic if the computed value could be memoized per request scope so that multiple calls to the method don't have to re-run the logic again.
