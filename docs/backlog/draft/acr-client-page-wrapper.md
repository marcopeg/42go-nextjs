# Create Client Page HOC [acr]

Create a client-side equivalent to `/src/42go/config/app-config-pages.tsx` `appPage()` for protecting client-rendered pages with feature flags.

The current `appPage()` implementation works only for server components, blocking access to pages not allowed by AppConfig's feature flags. We need the same protection for client-side rendered pages like those in `/src/app/(app)`.

## Goals

- [ ] Create `clientPage()` HOC for client-side page protection
- [ ] Extract shared feature flag logic into reusable module
- [ ] Rename `appPage()` to `serverPage()` for clarity
- [ ] Support same feature flag patterns: `"*"`, specific flags, `"url!"`

## Acceptance Criteria

- [ ] `clientPage()` HOC protects client components with feature flags
- [ ] Shared logic module handles flag matching for both server and client
- [ ] `serverPage()` replaces `appPage()` (no need to backward compatibility nor deprecation notices as we are still in active development)
- [ ] URL-based flag calculation works on client side with consistent behavior
- [ ] Error handling uses `notFound()` for consistency with server behavior
- [ ] Loading state is configurable with `null` as default (render nothing)
- [ ] Calendar page converted to `clientPage()` with appropriate feature flag
- [ ] All platform-agnostic logic extracted to shared module

## Technical Details

### Current Implementation Analysis

- **Server-side**: `appPage()` uses `getAppConfig()` and `headers()` to check flags
- **Client-side**: `useAppConfig()` hook provides access to app configuration
- **Feature Flag Logic**: Flag matching, wildcard support, URL calculation
- **URL Extraction**: Server uses `x-pathname` header, client needs `usePathname()`

### Implementation Requirements

1. **Shared Logic Module** (`/src/42go/config/feature-flags.ts`):

   - Extract flag matching logic from `appPage()`
   - Support wildcard (`*`), specific flags, URL-based (`url!`)
   - Pure functions for both server and client environments

2. **Client Page Wrapper** (`/src/42go/config/app-client-page.tsx`):

   - `clientPage()` HOC for client components
   - Use `useAppConfig()` and `usePathname()`
   - **Loading State**: Configurable via parameter, default to `null` (render nothing)
   - **Error Handling**: Use `notFound()` for consistency with server behavior

3. **Server Page Refactor**:

   - Rename `app-config-pages.tsx` to `app-server-page.tsx`
   - Rename `appPage()` to `serverPage()`
   - Keep `appPage()` as deprecated alias
   - Use shared flag logic module

4. **Shared Logic Extraction**:

   - URL-to-config-key conversion logic
   - Flag base splitting logic (`flagBase = flagsToCheck.split(":")[0]`)
   - All platform-agnostic feature flag logic

5. **Testing Strategy**:
   - Convert `/src/app/calendar/page.tsx` to use `clientPage()`
   - Add feature flag to calendar app config
   - Verify feature flag enforcement works
   - Ensure graceful degradation

## Current Usage Pattern

```tsx
// Server-side (current)
export default appPage(Component, "featureFlag");

// Client-side (needed) - with configurable loading state
export default clientPage(Component, "featureFlag", <LoadingSpinner />);
export default clientPage(Component, "featureFlag", null); // default - render nothing
export default clientPage(Component, "featureFlag"); // same as null
```

## Implementation Details

### Client Page HOC Signature

```tsx
function clientPage<P extends object>(
  PageComponent: React.ComponentType<P>,
  requiredFlags?: string,
  loadingComponent?: React.ReactNode | null
): React.ComponentType<P>;
```

### Shared Logic Functions

```tsx
// Pure functions for both environments
export function calculateUrlFlag(pathname: string): string;
export function checkFeatureFlag(
  availableFlags: string[],
  requiredFlags: string
): boolean;
export function getFlagBase(flagsToCheck: string): string;
```

## Next Steps

plan task (k2)
