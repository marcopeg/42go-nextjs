# Remove middleware [ade]

I want to remove the `@/middleware.ts` from the codebase by making `getAppID()` self-sufficient.

## Current Situation

The middleware's only purpose is to identify an appID from the incoming request and inject it as a header. The workflow is:

1. **Middleware** (`src/middleware.ts`) runs `matchAppID(request)` on every request
2. **Middleware** sets `X-42Go-AppID` header with the resolved appID
3. **getAppID()** (`src/42go/config/app-config.ts`) reads this header and returns it

This creates unnecessary complexity and an extra layer of indirection.

## Proposed Refactoring

Make `getAppID()` completely self-sufficient by moving the matching logic directly into it. Instead of reading the middleware-injected header:

```ts
// Current implementation
const headerList = await getHeaders();
const appIDHeader = headerList.get(APP_ID_HEADER);
```

The function should directly run the matching logic using the request headers. This logic should be moved from `@/42go/lib/app-id/index.ts` into the `@/42go/config` module with nicely structured methods that work with both Headers and NextRequest objects.

## Technical Challenge

The main challenge is that:

- **API Routes**: Have access to `NextRequest` object, so matching logic works directly
- **Server Components**: Only have access to `headers()` from `next/headers`, which returns a `Headers` object

We need to create a unified matching system that can:

1. Extract necessary request information from `headers()` or `NextRequest`
2. Run the existing matching logic (`matchByEnvironment`, `matchByHeaderPatterns`, `matchByUrl`)
3. Be organized within the `@/42go/config` module for better cohesion

## Benefits

- **Simplicity**: One less middleware layer to maintain
- **Performance**: Eliminate middleware overhead for requests that don't need app resolution
- **Clarity**: Direct relationship between `getAppID()` and matching logic
- **Flexibility**: Easier to test and modify matching behavior

## Implementation Notes

The existing matching functions in `@/42go/lib/app-id/matchers.ts` should be moved into `@/42go/config` and refactored to work with both Headers and NextRequest objects. They primarily rely on:

- Environment variables (already accessible)
- Headers object (available from `headers()` or `NextRequest.headers`)
- Host header (accessible via `headers().get("host")`)

**Architecture Improvement**: Moving matching logic into `@/42go/config` creates better cohesion between app identification and configuration management.

**Optimization Requirement**: The computed value must be memoized per request scope to avoid re-running matching logic on multiple calls within the same request.

## Goals

- [ ] Remove `src/middleware.ts` file completely
- [ ] Refactor `getAppID()` to run matching logic directly
- [ ] Move matching logic from `@/42go/lib/app-id` to `@/42go/config` module
- [ ] Create unified matching system that works with Headers and NextRequest
- [ ] Maintain all existing matching functionality (environment, header patterns, URL)
- [ ] Preserve request-scoped memoization behavior
- [ ] Update any dependent code that relies on middleware headers
- [ ] Ensure no regression in app identification logic

## Acceptance Criteria

- [ ] `src/middleware.ts` file deleted
- [ ] `getAppID()` function works without middleware-injected headers
- [ ] Matching logic moved from `@/42go/lib/app-id` to `@/42go/config` module
- [ ] All existing app matching logic continues to work (env, header patterns, URL)
- [ ] System works with both Headers (server components) and NextRequest (API routes)
- [ ] Request-scoped caching/memoization is maintained
- [ ] All tests pass and QA check succeeds
- [ ] No breaking changes to API routes or server components
- [ ] Debug headers (if needed) are handled appropriately
- [ ] Performance is maintained or improved

## Next Steps

plan task (k2)
