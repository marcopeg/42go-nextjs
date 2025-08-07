# Clean Up AppConfig Match Logic [adq]

> **DEPENDENCIES:**
>
> - [aci] Add `config.match.header` [🔗](../tasks/aci-config-match-header.md)
> - [adn] Add `config.match.fn` [🔗](../tasks/adn-config-match-function.md)
>
> **Status**: 🛑 BLOCKED - Do not work on this task until dependencies are completed!

Refactor the AppConfig matching system by extracting the `matchAppName` function from `AppConfig.ts` into a dedicated utility library at `@/42go/lib/match`. This improves code organization and enables easier testing and maintenance.

## Goals

- [ ] Extract `matchAppName` function from `AppConfig.ts` into `@/42go/lib/match` utility
- [ ] Create modular matching functions for different matching strategies (header, URL, function)
- [ ] Add `APP_NAME` environment variable override functionality
- [ ] Implement boot-time validation for app configuration
- [ ] Update imports in `middleware.ts` and other dependent files
- [ ] Maintain backward compatibility and existing functionality

## Acceptance Criteria

- [ ] `@/42go/lib/match/index.ts` exports `matchAppName` function with same signature
- [ ] `APP_NAME` environment variable skips all matching logic when set
- [ ] Boot validation checks that `APP_NAME` config exists and exits with error if not
- [ ] All existing matching logic works exactly as before
- [ ] `middleware.ts` imports from new location
- [ ] No functional changes to app resolution behavior
- [ ] Clean separation of concerns between config definition and matching logic

## Architecture Notes

**Current State** (`src/AppConfig.ts`):

- Contains both config definitions AND matching logic
- `matchAppName` function handles header + URL matching
- Mixing of concerns between data and behavior

**Target State** (`@/42go/lib/match/index.ts`):

- Pure matching utility functions
- Modular approach for different matching strategies
- Environment variable override support
- Boot-time validation

**Matching Priority Order**:

1. `APP_NAME` environment variable (highest priority)
2. Custom header (`X-App-Name`)
3. Custom function (`match.fn`) - from task [adn]
4. Header patterns (`match.header`) - from task [aci]
5. URL patterns (`match.url`)

## Implementation Notes

The refactoring should maintain Chuck Norris-level reliability while improving code organization. The `APP_NAME` environment variable provides a simple override mechanism for deployment scenarios where dynamic matching isn't needed.

## Development Plan

### Phase 1: Create Matching Utility Library ⚡

**Goal**: Create the new `@/42go/lib/match` module with modular matching functions

1. **Create the utility structure**:

   ```bash
   mkdir -p src/42go/lib/match
   ```

2. **Create core matching utilities** (`src/42go/lib/match/matchers.ts`):

   ```ts
   import type { NextRequest } from "next/server";
   import type { AppName, AppConfigItem } from "@/AppConfig";

   // Environment variable override
   export const matchByEnvironment = (
     availableApps: Record<string, AppConfigItem>
   ): AppName | null => {
     const envAppName = process.env.APP_NAME;
     if (!envAppName) return null;

     if (availableApps[envAppName]) {
       return envAppName as AppName;
     }

     throw new Error(
       `APP_NAME="${envAppName}" not found in available apps. Available: ${Object.keys(
         availableApps
       ).join(", ")}`
     );
   };

   // Header-based matching (existing logic)
   export const matchByHeader = (
     request: NextRequest,
     headerName: string,
     availableApps: Record<string, AppConfigItem>
   ): AppName | null => {
     const customSetupHeader = request.headers.get(headerName);
     if (
       customSetupHeader &&
       customSetupHeader !== "null" &&
       availableApps[customSetupHeader]
     ) {
       return customSetupHeader as AppName;
     }
     return null;
   };

   // URL pattern matching (existing logic)
   export const matchByUrl = (
     request: NextRequest,
     availableApps: Record<string, AppConfigItem>
   ): AppName | null => {
     const hostHeader = request.headers.get("host");
     for (const [appKey, appConfig] of Object.entries(availableApps)) {
       if (appConfig.match?.url) {
         const urlPatterns = Array.isArray(appConfig.match.url)
           ? appConfig.match.url
           : [appConfig.match.url];
         for (const pattern of urlPatterns) {
           try {
             const regex = new RegExp(pattern);
             if (hostHeader && regex.test(hostHeader)) {
               return appKey as AppName;
             }
           } catch {
             // Chuck Norris doesn't catch regex errors
           }
         }
       }
     }
     return null;
   };

   // Function-based matching (future from task [adn])
   export const matchByFunction = async (
     request: NextRequest,
     availableApps: Record<string, AppConfigItem>
   ): Promise<AppName | null> => {
     // Implementation will come from task [adn]
     return null;
   };

   // Header pattern matching (future from task [aci])
   export const matchByHeaderPatterns = (
     request: NextRequest,
     availableApps: Record<string, AppConfigItem>
   ): AppName | null => {
     // Implementation will come from task [aci]
     return null;
   };
   ```

3. **Create main matching function** (`src/42go/lib/match/index.ts`):

   ```ts
   import type { NextRequest } from "next/server";
   import { availableApps, APP_HEADER_NAME, type AppName } from "@/AppConfig";
   import {
     matchByEnvironment,
     matchByHeader,
     matchByFunction,
     matchByHeaderPatterns,
     matchByUrl,
   } from "./matchers";

   export const matchAppName = async (
     request: NextRequest
   ): Promise<AppName> => {
     // 1. Highest priority: APP_NAME environment variable
     try {
       const envMatch = matchByEnvironment(availableApps);
       if (envMatch) {
         console.log(`APP_NAME override: using ${envMatch}`);
         return envMatch;
       }
     } catch (error) {
       console.error("APP_NAME validation failed:", error.message);
       process.exit(1);
     }

     // 2. Custom header (X-App-Name)
     const headerMatch = matchByHeader(request, APP_HEADER_NAME, availableApps);
     if (headerMatch) return headerMatch;

     // 3. Custom function matching (from task [adn])
     const functionMatch = await matchByFunction(request, availableApps);
     if (functionMatch) return functionMatch;

     // 4. Header pattern matching (from task [aci])
     const headerPatternMatch = matchByHeaderPatterns(request, availableApps);
     if (headerPatternMatch) return headerPatternMatch;

     // 5. URL pattern matching
     const urlMatch = matchByUrl(request, availableApps);
     if (urlMatch) return urlMatch;

     // Unknown host - return null to trigger 404
     return null;
   };

   // Re-export for convenience
   export { APP_HEADER_NAME } from "@/AppConfig";
   ```

### Phase 2: Add Boot-Time Validation ⚡

**Goal**: Implement startup validation for APP_NAME environment variable

1. **Create validation utility** (`src/42go/lib/match/validation.ts`):

   ```ts
   import { availableApps } from "@/AppConfig";

   export const validateAppEnvironment = (): void => {
     const envAppName = process.env.APP_NAME;

     if (envAppName && !availableApps[envAppName]) {
       console.error(`❌ APP_NAME validation failed:`);
       console.error(`   Specified: "${envAppName}"`);
       console.error(`   Available: ${Object.keys(availableApps).join(", ")}`);
       process.exit(1);
     }

     if (envAppName) {
       console.log(`✅ APP_NAME override validated: ${envAppName}`);
     }
   };
   ```

2. **Add validation to application startup**:
   - Hook into Next.js startup process
   - Call validation early in application lifecycle

### Phase 3: Update Imports and Remove Old Code ⚡

**Goal**: Update all imports and remove the old `matchAppName` from AppConfig.ts

1. **Update middleware imports** (`src/middleware.ts`):

   ```ts
   // Change from:
   import { matchAppName, APP_HEADER_NAME } from "@/AppConfig";

   // To:
   import { matchAppName, APP_HEADER_NAME } from "@/42go/lib/match";
   ```

2. **Remove matching logic from AppConfig.ts**:

   - Remove the `matchAppName` function
   - Keep only config definitions and types
   - Update exports to remove `matchAppName`

3. **Update documentation**:
   - Update `docs/articles/APP_CONFIG.md` to reference new location
   - Update Memory Bank files to reflect the architectural change

### Phase 4: Testing and Validation ⚡

**Goal**: Ensure Chuck Norris-level reliability after refactoring

1. **Test all matching scenarios**:

   - Environment variable override (`APP_NAME=default`)
   - Header-based matching (`X-App-Name: app1`)
   - URL pattern matching (localhost:3000)
   - Boot validation (invalid `APP_NAME`)

2. **Build and lint validation**:

   ```bash
   npm run qa
   ```

3. **Runtime testing**:
   - Start development server
   - Test each app configuration
   - Verify middleware behavior unchanged

### Files to Create/Modify

**New Files**:

- `src/42go/lib/match/index.ts` - Main matching function
- `src/42go/lib/match/matchers.ts` - Individual matching utilities
- `src/42go/lib/match/validation.ts` - Boot validation

**Modified Files**:

- `src/AppConfig.ts` - Remove `matchAppName` function
- `src/middleware.ts` - Update import path
- `docs/memory-bank/ARCHITECTURE.md` - Update matching documentation
- `docs/articles/APP_CONFIG.md` - Update matching documentation

### Dependencies Integration

**After task [aci] completion**:

- Update `matchByHeaderPatterns` function with header matching logic
- Import and integrate header matching utilities

**After task [adn] completion**:

- Update `matchByFunction` function with custom function logic
- Import and integrate function matching utilities

### Architectural Benefits

- **Separation of Concerns**: Config definition vs matching logic
- **Testability**: Individual matching functions can be unit tested
- **Extensibility**: Easy to add new matching strategies
- **Environment Support**: Simple override for deployment scenarios
- **Boot Safety**: Early validation prevents runtime surprises

## Next Steps

execute task (k3)
