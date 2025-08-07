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

1. **Custom Header** (`X-App-Name`): Highest priority (existing)
2. **Custom Function** (`match.fn`): Second priority (new)
3. **Header Matching** (`match.header`): Third priority (task [aci])
4. **URL Matching** (`match.url`): Lowest priority (existing)

## Development Plan

### Phase 1: Type System and Context

1. Define `MatchContext` interface with db, config, env access
2. Extend `AppConfigItem.match` interface with function support
3. Create context builder function for database and config access

### Phase 2: Core Implementation

1. Add function matching logic to `matchAppName`
2. Implement context creation with database connection
3. Add proper error handling and logging for custom functions
4. Ensure async/await compatibility throughout the chain

### Phase 3: Integration & Testing

1. Test with various custom matching scenarios
2. Verify database connection and query capabilities
3. Test error handling for failed custom functions
4. Document the new feature in Memory Bank
5. Create example configurations and use cases

## Security Considerations

- Custom functions run in server context with full database access
- Implement timeout protection for slow custom functions
- Add logging for debugging custom matching logic
- Validate that custom functions don't expose sensitive data

## Performance Considerations

- Custom functions are evaluated for every request
- Consider caching strategies for expensive operations
- Add performance monitoring for custom matching functions
- Ensure database queries are optimized

## Next Steps

refine task (k4)
