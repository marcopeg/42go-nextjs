---
taskId: ADE
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-22T10:49:59+02:00
---

# Remove middleware [ade] ✅ COMPLETED

I want to remove the `@/middleware.ts` from the codebase by making `getAppID()` self-sufficient, with a gradual transition strategy.

## 🎉 Implementation Complete


**What Was Delivered**:

- ✅ Abstract headers system for unified header handling
- ✅ Updated matching logic to work with both NextRequest and Headers
- ✅ Fallback strategy in `getAppID()` functions
- ✅ Updated API routes to use direct resolution
- ✅ Middleware app resolution commented out (preserving debug headers)
- ✅ No breaking changes - system maintains backward compatibility

**Files Updated**:

- `src/42go/config/abstract-headers.ts` - New unified headers interface
- `src/42go/lib/app-id/matchers.ts` - Updated for abstract headers
- `src/42go/config/app-config.ts` - New fallback strategy
- `src/app/api/quicklists/[projectId]/route.ts` - Uses direct resolution
- `src/middleware.ts` - App resolution commented out

## Current Situation

The middleware's only purpose is to identify an appID from the incoming request and inject it as a header. The workflow is:

1. **Middleware** (`src/middleware.ts`) runs `matchAppID(request)` on every request
2. **Middleware** sets `X-42Go-AppID` header with the resolved appID
3. **getAppID()** (`src/42go/config/app-config.ts`) reads this header and returns it

This creates unnecessary complexity and causes **Docker production issues** where middleware doesn't execute in standalone builds.

## Proposed Refactoring Strategy ✅

### Phase 1: Abstract Headers System ✅ COMPLETED

Created a unified header abstraction that works with both `NextRequest` and `Headers`:

```ts
// src/42go/config/abstract-headers.ts
export interface AbstractHeaders {
  get(name: string): string | null;
  has(name: string): boolean;
  host?: string;
  url?: string;
}

export const fromNextRequest = (req: NextRequest): AbstractHeaders => { ... }
export const fromHeaders = (headers: Headers): AbstractHeaders => { ... }
```

### Phase 2: Unified Matching Logic ✅ COMPLETED

Updated matching logic to use abstract headers:

- `matchAppByHeaders()` - works with AbstractHeaders
- `matchAppByUrl()` - works with AbstractHeaders
- Legacy functions preserved for compatibility

### Phase 3: Graceful Fallback in getAppID() ✅ COMPLETED

Implemented fallback strategy in `getAppID()`:

1. ✅ **Try middleware header** (backward compatibility)
2. ✅ **Try environment matching** (NODE_ENV based)
3. ✅ **Try header pattern matching** (custom header rules)
4. ✅ **Try URL pattern matching** (host-based routing)
5. ✅ **Fallback to default app** (existing behavior)
6. ✅ **Return null** (existing behavior)

### Phase 4: API Routes Update ✅ COMPLETED

- ✅ Created `getAppIDFromHeaders()` for API routes
- ✅ Updated `/api/quicklists/[projectId]/route.ts` to use direct resolution
- ✅ No async/await needed in API routes - synchronous resolution

### Phase 5: Middleware Cleanup ✅ COMPLETED

- ✅ Commented out app resolution in middleware
- ✅ Preserved debug headers for production troubleshooting
- ✅ Middleware still executes but doesn't set app ID header

## Benefits

- **Docker Production Fix**: Resolves middleware execution issues in standalone builds
- **Gradual Migration**: No breaking changes during transition
- **Flexibility**: System works with or without middleware
- **Performance**: Direct resolution when middleware fails
- **Testing**: Easy to validate both paths work

## Technical Challenge

The main challenge is creating a unified system that works in multiple contexts:

- **API Routes**: Have access to `NextRequest` object
- **Server Components**: Only have access to `headers()` from `next/headers`
- **Middleware**: Has `NextRequest` but may not execute in Docker standalone

**Solution**: Create an abstract headers interface that normalizes both contexts, allowing shared matching logic.

## Implementation Notes

**Abstract Headers System**: Create a unified interface that extracts necessary information from either `NextRequest.headers` or `Headers` from `next/headers`.

**Matching Logic**: Existing functions in `@/42go/lib/app-id/matchers.ts` should be adapted to work with the abstract headers interface.

**Fallback Strategy**: The new `getAppID()` will try multiple resolution strategies in order, ensuring compatibility during transition and robustness in production.

**Debug Headers**: Skip debug headers for now - they were temporary for troubleshooting middleware issues.

**Testing**: Focus on development environment initially - Docker testing will be manual after dev validation.## Goals

- [ ] Create abstract headers interface for unified request handling
- [ ] Move matching logic to work with abstract headers
- [ ] Implement fallback strategy in `getAppID()` (middleware → direct → default → null)
- [ ] Maintain backward compatibility during transition
- [ ] Resolve Docker production middleware execution issues
- [ ] Update test API routes to work with new approach
- [ ] Preserve request-scoped memoization behavior
- [ ] Keep middleware file but comment out app resolution (optional cleanup later)

## Acceptance Criteria

- [ ] Abstract headers interface created and working with both NextRequest and Headers
- [ ] Matching logic adapted to use abstract headers interface
- [ ] `getAppID()` implements fallback strategy: middleware → direct → default → null
- [ ] All existing app matching logic continues to work (env, header patterns, URL)
- [ ] System resolves apps in Docker production environment (fixes [aem] issue)
- [ ] Test API routes updated to work with new approach
- [ ] Request-scoped caching/memoization is maintained
- [ ] Development environment works identically to current behavior
- [ ] All tests pass and QA check succeeds
- [ ] Middleware file preserved but app resolution commented out (for optional future removal)

## Next Steps

plan task (k2)

## Development Plan

### Phase 1: Abstract Headers Interface ⚡

**Goal**: Create a unified headers abstraction that works with both `NextRequest` and `Headers`

1. **Create abstract headers interface** (`src/42go/config/abstract-headers.ts`):

   ```ts
   interface AbstractHeaders {
     get(name: string): string | null;
     has(name: string): boolean;
     host?: string;
     url?: string;
   }

   // NextRequest -> AbstractHeaders
   export const fromNextRequest = (req: NextRequest): AbstractHeaders

   // Headers (from next/headers) -> AbstractHeaders
   export const fromHeaders = (headers: Headers): AbstractHeaders
   ```

2. **Test the abstraction** works with both contexts

### Phase 2: Unified Matching Logic ⚡

**Goal**: Adapt existing matchers to use abstract headers

1. **Update matchers** (`src/42go/lib/app-id/matchers.ts`):

   - Modify `matchByHeaderPatterns` to accept `AbstractHeaders`
   - Modify `matchByUrl` to accept `AbstractHeaders`
   - Keep `matchByEnvironment` unchanged (no headers needed)

2. **Create unified match function**:

   ```ts
   export const matchAppIDFromHeaders = (headers: AbstractHeaders): TAppID => {
     // Environment (highest priority)
     const envMatch = matchByEnvironment(apps);
     if (envMatch) return envMatch;

     // Header patterns
     const headerMatch = matchByHeaderPatterns(headers, apps);
     if (headerMatch) return headerMatch;

     // URL patterns
     const urlMatch = matchByUrl(headers, apps);
     if (urlMatch) return urlMatch;

     return null;
   };
   ```

### Phase 3: Enhanced getAppID() with Fallback ⚡

**Goal**: Implement graceful fallback strategy in `getAppID()`

1. **Update `getAppID()`** (`src/42go/config/app-config.ts`):

   ```ts
   export const getAppID = cache(async (): Promise<TAppID> => {
     const headerList = await getHeaders();

     // 1. Try middleware header (current behavior)
     const middlewareHeader = headerList.get(APP_ID_HEADER);
     if (middlewareHeader && apps[middlewareHeader]) {
       return middlewareHeader as TAppID;
     }

     // 2. Fallback to direct resolution (new capability)
     try {
       const abstractHeaders = fromHeaders(headerList);
       const directMatch = matchAppIDFromHeaders(abstractHeaders);
       if (directMatch) return directMatch;
     } catch (error) {
       console.warn("Direct app resolution failed:", error);
     }

     // 3. Fallback to default app (existing behavior)
     if (DEFAULT_APP) {
       console.warn("Using default app:", DEFAULT_APP);
       return DEFAULT_APP;
     }

     // 4. Return null (existing behavior)
     console.warn("No app matched, returning null");
     return null;
   });
   ```

### Phase 4: Update API Routes & Testing ⚡

**Goal**: Ensure API routes work with the new system

1. **Update test API route** (`src/app/api/test/app-name/route.ts`):

   - Test both middleware path and direct resolution path
   - Add debug info showing which resolution method was used

2. **Update other affected API routes**:
   - Any routes using `getAppID()` should continue working
   - Routes with `NextRequest` can optionally use direct matching for better performance

### Phase 5: Optional Middleware Cleanup ⚡

**Goal**: Prepare middleware for optional removal

1. **Comment out app resolution in middleware**:

   ```ts
   export async function middleware(request: NextRequest) {
     // Comment out app resolution for now - getAppID() handles it
     // const appID = await matchAppID(request);
     // if (appID) {
     //   requestHeaders.set(APP_ID_HEADER, appID);
     // }

     // Keep other middleware functionality if any
     return NextResponse.next();
   }
   ```

2. **Test thoroughly** that system works without middleware app resolution

### Phase 6: Validation & Performance ⚡

**Goal**: Ensure the solution is robust and performant

1. **Test development environment** thoroughly
2. **Verify request-scoped caching** works correctly
3. **Check performance impact** of fallback strategy
4. **Validate** that Docker production issues are resolved

## Related Tasks

- **Supersedes [aem]**: This solution should resolve Docker middleware execution issues
- **Updates test routes**: API routes that depend on app resolution will be updated
