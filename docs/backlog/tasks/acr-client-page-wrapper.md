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

## Development Plan

### Phase 1: Extract Shared Feature Flag Logic

**File**: `/src/42go/config/feature-flags.ts`

1. **Extract from `appPage()`**:

   - URL-to-config-key conversion: `/foo/bar` → `"foo/bar"`
   - Flag base splitting: `flagsToCheck.split(":")[0]`
   - Feature flag matching logic with wildcard support
   - Component name fallback logic

2. **Pure Functions**:

   ```tsx
   export const calculateUrlFlag = (pathname: string): string => {
     const pathSegments = pathname
       .replace(/^\//, "")
       .split("/")
       .filter(Boolean);
     return pathSegments.join("/").toLowerCase() || "HomePage";
   };

   export const getFlagBase = (flagsToCheck: string): string =>
     flagsToCheck.split(":")[0];

   export const checkFeatureFlag = (
     availableFlags: string[],
     flagsToCheck: string
   ): boolean => {
     if (availableFlags.includes("*")) return true;
     if (availableFlags.includes(flagsToCheck)) return true;

     const flagBase = getFlagBase(flagsToCheck);
     return availableFlags.includes(`${flagBase}:*`);
   };

   export const resolveFlagName = (
     requiredFlags: string | undefined,
     componentName: string,
     pathname?: string
   ): string => {
     if (requiredFlags === "url!") {
       return calculateUrlFlag(pathname || "/");
     }
     return requiredFlags || componentName || "Page";
   };
   ```

### Phase 2: Create Client Page Wrapper

**File**: `/src/42go/config/app-client-page.tsx`

1. **Client HOC Implementation**:

   ```tsx
   "use client";
   import { notFound } from "next/navigation";
   import { usePathname } from "next/navigation";
   import { useAppConfig } from "./use-app-config";
   import { checkFeatureFlag, resolveFlagName } from "./feature-flags";

   export function clientPage<P extends object>(
     PageComponent: React.ComponentType<P>,
     requiredFlags?: string,
     loadingComponent: React.ReactNode | null = null
   ): React.ComponentType<P> {
     const ClientPageWrapper = (props: P) => {
       const config = useAppConfig();
       const pathname = usePathname();

       // Loading state while config resolves
       if (!config) {
         return loadingComponent;
       }

       // Feature flag validation
       const availableFlags = config.featureFlags.pages;
       if (requiredFlags === "*" || availableFlags.includes("*")) {
         return <PageComponent {...props} />;
       }

       const componentName =
         PageComponent.displayName || PageComponent.name || "Component";
       const flagsToCheck = resolveFlagName(
         requiredFlags,
         componentName,
         pathname
       );

       if (!checkFeatureFlag(availableFlags, flagsToCheck)) {
         notFound();
       }

       return <PageComponent {...props} />;
     };

     ClientPageWrapper.displayName = `clientPage(${
       PageComponent.displayName || PageComponent.name
     })`;
     return ClientPageWrapper;
   }
   ```

### Phase 3: Refactor Server Page Implementation

**File**: `/src/42go/config/app-server-page.tsx` (renamed from `app-config-pages.tsx`)

1. **Extract and use shared logic**:

   ```tsx
   import { checkFeatureFlag, resolveFlagName } from "./feature-flags";

   export function serverPage<P extends object>(
     PageComponent: React.ComponentType<P>,
     requiredFlags?: string
   ) {
     const ServerPageWrapper = async (props: P) => {
       const config = await getAppConfig();
       if (!config) notFound();

       const availableFlags = config.featureFlags.pages;
       if (requiredFlags === "*" || availableFlags.includes("*")) {
         return <PageComponent {...props} />;
       }

       // Get pathname from middleware header for URL-based flags
       let pathname = "/";
       if (requiredFlags === "url!") {
         const headersList = await headers();
         pathname = headersList.get("x-pathname") || headersList.get("x-url") || "/";
       }

       const componentName = PageComponent.displayName || PageComponent.name || "Component";
       const flagsToCheck = resolveFlagName(requiredFlags, componentName, pathname);

       if (!checkFeatureFlag(availableFlags, flagsToCheck)) {
         notFound();
       }

       return <PageComponent {...props> />;
     };

     ServerPageWrapper.displayName = `serverPage(${PageComponent.displayName || PageComponent.name})`;
     return ServerPageWrapper;
   }

   // Deprecated alias
   export const appPage = serverPage;
   ```

### Phase 4: Update Calendar Page

**File**: `/src/app/calendar/page.tsx`

1. **Convert to client page**:

   ```tsx
   import { clientPage } from "@/42go/config/app-client-page";
   import CalendarClient from "./CalendarClient";

   function CalendarPage() {
     return <CalendarClient />;
   }

   export default clientPage(CalendarPage, "CalendarPage");
   ```

2. **Calendar app config already has the feature flag**: `featureFlags.pages: ["CalendarPage"]`

### Phase 5: Progressive Migration

1. **Update existing server pages** to use `serverPage` (optional):

   - `/src/app/(public)/page.tsx`
   - `/src/app/(public)/docs/page.tsx`
   - `/src/app/(public)/docs/[...slug]/page.tsx`
   - `/src/app/(public)/todos/page.tsx`

2. **Test both implementations** work with same feature flag logic

### Files to Create/Modify

- **Create**: `/src/42go/config/feature-flags.ts` - Shared logic
- **Create**: `/src/42go/config/app-client-page.tsx` - Client wrapper
- **Rename**: `/src/42go/config/app-config-pages.tsx` → `/src/42go/config/app-server-page.tsx`
- **Modify**: `/src/app/calendar/page.tsx` - Use clientPage
- **Update**: All imports from `app-config-pages` to `app-server-page`

### Validation Strategy

1. **Feature Flag Testing**:

   - Test with calendar app config (has "CalendarPage" flag)
   - Verify client page respects feature flags
   - Test URL-based flags work on client side

2. **Loading Behavior**:
   - Test default `null` loading state
   - Test custom loading component
   - Verify graceful config resolution

## Next Steps

execute task (k3)
