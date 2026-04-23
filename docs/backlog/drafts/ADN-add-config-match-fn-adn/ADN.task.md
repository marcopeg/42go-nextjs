---
taskId: ADN
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Add config.match.fn [adn]

Extend the AppConfig matching system to support custom function-based app resolution. This enables complex matching logic with database access, environment variables, and full request context.

## Goals

- [ ] Extend `AppConfigItem.match` interface to support async function matching
- [ ] Provide comprehensive context object to matching function
- [ ] Enable database access and environment variable access
- [ ] Support async operations in matching logic
- [ ] Maintain backward compatibility with existing matching methods

## Acceptance Criteria

- [ ] `AppConfigItem.match.fn` type is properly defined with async signature
- [ ] Function receives request object and context with db, config, and env access
- [ ] Function can perform database queries using the standard Knex connector
- [ ] Function can access environment variables and other app configurations
- [ ] Custom matching takes highest precedence in matching order
- [ ] Error handling prevents crashes and provides meaningful feedback
- [ ] Documentation is updated in Memory Bank

## Implementation Details

### TypeScript Interface

```ts
interface MatchContext {
  env: NodeJS.ProcessEnv; // Environment variables
  config: typeof availableApps; // All available app configurations
  db: KnexInstance; // Standard Knex database connector
}

interface AppConfigItem {
  match?: {
    url?: string | string[];
    header?: HeaderMatchConfig;
    fn?: (request: NextRequest, context: MatchContext) => Promise<boolean>;
  };
}
```

### Example Configuration

```ts
const customMatchLogic = async (
  request: NextRequest,
  { db, config, env }: MatchContext
): Promise<boolean> => {
  // Example 1: Database-based matching
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    const tenant = await db("tenants")
      .where("api_key", apiKey)
      .where("app_name", "my-app")
      .first();
    return !!tenant;
  }

  // Example 2: Complex URL + header logic
  const host = request.headers.get("host");
  const userAgent = request.headers.get("user-agent");

  if (host?.includes("beta.") && userAgent?.includes("Mobile")) {
    return true;
  }

  // Example 3: Environment-based logic
  const featureFlag = env.ENABLE_ADVANCED_MATCHING;
  if (featureFlag === "true") {
    // Custom business logic here
    return request.nextUrl.pathname.startsWith("/advanced");
  }

  return false;
};

const appConfig = {
  name: "Advanced App",
  match: {
    fn: customMatchLogic,
  },
  // ... rest of config
};
```

### Matching Logic Priority

1. **Custom Header** (`X-42Go-AppID`): Highest priority (existing)
2. **Custom Function** (`match.fn`): Second priority (new)
3. **Header Matching** (`match.header`): Third priority (task [aci])
4. **URL Matching** (`match.url`): Lowest priority (existing)

## Development Plan

### Phase 1: Type System and Context ⚡

**Goal**: Define the function matching interface and context system

1. **Create context interface** in `src/AppConfig.ts`:

   ```ts
   import type { Knex } from "knex";
   import type { NextRequest } from "next/server";

   interface AppConfigMatchContext {
     db: Knex; // From getDB() singleton
     env: NodeJS.ProcessEnv; // Environment variables
     config: typeof availableApps; // All app configurations
   }

   type AppConfigMatchFunction = (
     request: NextRequest,
     context: MatchContext
   ) => Promise<boolean>;
   ```

2. **Extend AppConfig interface**:

   ```ts
   interface AppConfigItem {
     match?: {
       url?: string | string[];
       header?: AppConfigMatchContext;
       fn?: AppConfig; // NEW: Custom async function
     };
   }
   ```

3. **Create context builder function**:

   ```ts
   import { getDB } from "@/42go/db";

   const createMatchContext = (): AppConfigMatchContext => ({
     db: getDB(),
     env: process.env,
     config: availableApps,
   });
   ```

### Phase 2: Core Implementation ⚡

**Goal**: Implement function matching in the `matchAppID` function

1. **Add function matching logic** to `matchAppID`:

   ```ts
   export const matchAppID = async (request: NextRequest): Promise<AppName> => {
     // 1. Existing: Custom header (highest priority)
     const customSetupHeader = request.headers.get(APP_HEADER_NAME);
     if (
       customSetupHeader &&
       customSetupHeader !== "null" &&
       availableApps[customSetupHeader as keyof typeof availableApps]
     ) {
       return customSetupHeader as AppName;
     }

     // 2. NEW: Custom function matching (second priority)
     const context = createMatchContext();

     for (const [appKey, appConfig] of Object.entries(availableApps)) {
       if (appConfig.match?.fn) {
         try {
           const startTime = Date.now();
           const matches = await Promise.race([
             appConfig.match.fn(request, context),
             new Promise<boolean>((_, reject) =>
               setTimeout(() => reject(new Error("Timeout")), 5000)
             ),
           ]);

           const duration = Date.now() - startTime;
           console.log(
             `Custom function match for ${appKey}: ${matches} (${duration}ms)`
           );

           if (matches) {
             return appKey as AppName;
           }
         } catch (error) {
           console.error(`Custom function error for app ${appKey}:`, error);
           // Continue to next matching method
         }
       }
     }

     // 3. Existing: Header patterns (third priority) - from task [aci]
     // ... existing header matching logic

     // 4. Existing: URL patterns (lowest priority)
     // ... existing URL matching logic

     return null;
   };
   ```

2. **Add example configurations**:

   ```ts
   // Database-based tenant matching
   const tenantMatcher = async (
     request: NextRequest,
     { db }: MatchContext
   ): Promise<boolean> => {
     const apiKey = request.headers.get("X-API-Key");
     if (!apiKey) return false;

     const tenant = await db("tenants")
       .where("api_key", apiKey)
       .where("app_name", "tenant-app")
       .where("status", "active")
       .first();

     return !!tenant;
   };

   // Environment + path based matching
   const betaMatcher = async (
     request: NextRequest,
     { env }: MatchContext
   ): Promise<boolean> => {
     if (env.ENABLE_BETA_FEATURES !== "true") return false;

     const host = request.headers.get("host");
     const userAgent = request.headers.get("user-agent") || "";

     return host?.includes("beta.") && userAgent.includes("Mobile");
   };

   // Complex business logic matcher
   const advancedMatcher = async (
     request: NextRequest,
     { db, env, config }: MatchContext
   ): Promise<boolean> => {
     // Check feature flag
     if (env.ADVANCED_MATCHING !== "true") return false;

     // Check if other apps would match first
     const defaultApp = config.default;
     if (defaultApp?.match?.url) {
       const host = request.headers.get("host");
       // Custom logic here...
     }

     // Database check for premium features
     const userId = request.headers.get("X-User-ID");
     if (userId) {
       const user = await db("users")
         .where("id", userId)
         .where("premium", true)
         .first();
       return !!user;
     }

     return false;
   };

   export const availableApps = {
     "tenant-app": {
       name: "Tenant App",
       match: { fn: tenantMatcher },
       // ... rest of config
     },
     "beta-mobile": {
       name: "Beta Mobile",
       match: { fn: betaMatcher },
       // ... rest of config
     },
     advanced: {
       name: "Advanced Features",
       match: { fn: advancedMatcher },
       // ... rest of config
     },
   };
   ```

### Phase 3: Integration & Testing ⚡

**Goal**: Test, optimize, and document the implementation

1. **Create test migration for tenant matching**:

   ```bash
   npx knex migrate:make create_tenants_table
   ```

   ```js
   // knex/migrations/xxx_create_tenants_table.js
   exports.up = function (knex) {
     return knex.schema.createTable("tenants", (table) => {
       table.increments("id").primary();
       table.string("api_key").unique().notNullable();
       table.string("app_name").notNullable();
       table.string("status").defaultTo("active");
       table.timestamps(true, true);
     });
   };
   ```

2. **Add performance monitoring**:

   ```ts
   // Track slow custom functions
   const SLOW_FUNCTION_THRESHOLD = 1000; // 1 second

   if (duration > SLOW_FUNCTION_THRESHOLD) {
     console.warn(`Slow custom function for ${appKey}: ${duration}ms`);
   }
   ```

3. **Error handling and debugging**:

   ```ts
   // Add request context to error logs
   console.error(`Custom function error for app ${appKey}:`, {
     error: error.message,
     url: request.url,
     method: request.method,
     headers: Object.fromEntries(request.headers.entries()),
   });
   ```

4. **Update documentation**:
   - Add function matching to `FEATURES.md`
   - Document security considerations in `ARCHITECTURE.md`
   - Create examples in `APP_CONFIG.md`

### Files to Modify

1. `src/AppConfig.ts` - Type definitions and matching logic
2. `knex/migrations/xxx_create_tenants_table.js` - Test table for examples
3. `docs/memory-bank/FEATURES.md` - Document new capability
4. `docs/memory-bank/ARCHITECTURE.md` - Security and performance notes
5. `docs/articles/APP_CONFIG.md` - Usage examples

### Security Considerations

1. **Timeout Protection**: 5-second timeout to prevent hanging requests
2. **Error Isolation**: Errors in custom functions don't break other matching
3. **Database Access**: Full Knex access requires careful query design
4. **Logging**: Avoid logging sensitive data in custom function errors

### Performance Optimization

1. **Connection Reuse**: Use singleton `getDB()` for connection pooling
2. **Caching Strategy**: Consider caching results for expensive operations
3. **Query Optimization**: Use database indexes for custom matching queries
4. **Function Ordering**: Place fastest custom functions first in config

### Example Test Scenarios

```bash
# Test tenant API key matching
curl -H "X-API-Key: tenant-app-secret-key" http://localhost:3000/

# Test beta + mobile matching
curl -H "User-Agent: Mobile Safari" http://beta.localhost:3000/

# Test advanced user matching
curl -H "X-User-ID: premium-user-123" http://localhost:3000/
```

### Database Schema for Testing

```sql
-- Test data for tenant matching
INSERT INTO tenants (api_key, app_name, status) VALUES
('tenant-app-secret-key', 'tenant-app', 'active'),
('beta-mobile-key', 'beta-mobile', 'active');

-- Test data for user premium matching
INSERT INTO users (id, premium) VALUES
('premium-user-123', true),
('regular-user-456', false);
```

## Edge Runtime Findings & Considerations

- Next.js middleware (Edge Runtime) cannot import or even reference any config object that contains functions (especially async functions) due to serialization and runtime restrictions.
- Adding a `match.fn` property to `AppConfig` (even if not called) will break the Edge Runtime if the config is imported by middleware.
- This is not about the `fn` keyword, but about the presence of a function in the config object. Edge Runtime is strict about what can be imported and inspected.
- Other properties like icons or React components work because they are not executed or inspected in Edge, and are only used in client/server code.
- Any function in a config object imported by middleware will cause runtime errors, even if you guard against execution.

## Proposed Solution: Config Split

- **Split the config:**
  - Create an Edge-safe config (no functions) for middleware and Edge Runtime usage.
  - Create a server-only config (with `match.fn` and other advanced logic) for backend/server code.
- **How:**
  - Move all `fn` logic to a separate file, e.g., `AppConfig.server.ts`.
  - Keep `AppConfig.ts` strictly Edge-compatible.
  - Middleware imports only the Edge-safe config.
  - Backend/server code imports the full config with `fn`.
- **Result:**
  - No more Edge Runtime errors.
  - Full power for server-side matching logic.

## Next Steps

- Refactor config as described above.
- Document the split and usage in the Memory Bank and developer docs.
- Update all imports to use the correct config for their runtime.
