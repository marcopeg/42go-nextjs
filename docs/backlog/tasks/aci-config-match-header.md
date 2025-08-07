# Add config.match.header [aci]

Extend the AppConfig matching system to support HTTP header-based app resolution. This enables app selection based on custom headers, API keys, or request metadata.

## Goals

- [ ] Extend `AppConfigItem.match` interface to support header-based matching
- [ ] Implement header matching logic in `matchAppName` function
- [ ] Support both string and regex patterns for header keys and values
- [ ] Support list matching with "any" or "all" modes
- [ ] Maintain backward compatibility with existing `config.match.url`

## Acceptance Criteria

- [ ] `AppConfigItem.match.header` type is properly defined
- [ ] Header matching works with string patterns (case-insensitive for keys)
- [ ] Header matching works with regex patterns
- [ ] List matching supports both "any" (default) and "all" modes
- [ ] Integration with existing `matchAppName` function
- [ ] Header matching takes precedence after custom header but before URL matching
- [ ] Documentation is updated in Memory Bank

## Implementation Details

### TypeScript Interface

```ts
interface AppConfigItem {
  match?: {
    url?: string | string[];
    header?: {
      mode?: "any" | "all"; // Default: "any"
      keys: Array<{
        key: string | RegExp; // Header name (case-insensitive if string)
        value: string | RegExp | Array<string | RegExp>; // Header value(s)
        mode?: "any" | "all"; // For array values, default: "any"
      }>;
    };
  };
}
```

### Example Configuration

```ts
const config = {
  match: {
    header: {
      mode: "any", // Match any of the key patterns
      keys: [
        {
          key: "X-App", // Case-insensitive string match
          value: "foobar", // Exact value match
        },
        {
          key: /^X-App-.*/i, // Regex pattern for header name
          value: [/app[12]/, "special"], // Array with regex and string
          mode: "any", // Match any value in the array
        },
        {
          key: "Authorization",
          value: /^Bearer .+api-key-app1.+$/,
        },
      ],
    },
  },
};
```

### Matching Logic

1. **Header Key Matching**:
   - String: Case-insensitive comparison
   - RegExp: Direct pattern test
2. **Header Value Matching**:
   - String: Exact match (case-sensitive)
   - RegExp: Pattern test
   - Array: Test each item based on mode
3. **Mode Logic**:
   - "any": First positive match wins
   - "all": All conditions must pass

## Development Plan

### Phase 1: Type System Extension ⚡

**Goal**: Extend the AppConfig type system to support header-based matching

1. **Update `src/AppConfig.ts` types**:

   ```ts
   interface HeaderMatchRule {
     key: string | RegExp;
     value: string | RegExp | Array<string | RegExp>;
     mode?: "any" | "all"; // For array values
   }

   interface HeaderMatchConfig {
     mode?: "any" | "all"; // For multiple rules
     keys: HeaderMatchRule[];
   }

   interface AppConfigItem {
     match?: {
       url?: string | string[];
       header?: HeaderMatchConfig; // NEW
     };
   }
   ```

2. **Add example configurations** to existing apps:

   ```ts
   // Example for app1: Match API key in Authorization header
   app1: {
     // ... existing config
     match: {
       url: ["app1\\.localhost:3000"],
       header: {
         keys: [
           {
             key: "Authorization",
             value: /^Bearer .+app1-api-key.+$/,
           }
         ]
       }
     }
   },

   // Example for calendar: Match custom app header
   calendar: {
     // ... existing config
     match: {
       url: ["calendar\\.localhost:3000"],
       header: {
         keys: [
           {
             key: "X-App-Type",
             value: ["calendar", "scheduling"],
             mode: "any"
           }
         ]
       }
     }
   }
   ```

### Phase 2: Core Implementation ⚡

**Goal**: Implement header matching logic in the `matchAppName` function

1. **Create header matching utility functions**:

   ```ts
   // Add to src/AppConfig.ts or create src/42go/lib/match-helpers.ts

   const isRegExp = (value: any): value is RegExp => value instanceof RegExp;

   const matchHeaderKey = (
     headerName: string,
     pattern: string | RegExp
   ): boolean => {
     if (isRegExp(pattern)) {
       return pattern.test(headerName);
     }
     return headerName.toLowerCase() === pattern.toLowerCase();
   };

   const matchHeaderValue = (
     headerValue: string,
     pattern: string | RegExp
   ): boolean => {
     if (isRegExp(pattern)) {
       return pattern.test(headerValue);
     }
     return headerValue === pattern;
   };

   const matchHeaderRule = (
     headers: Headers,
     rule: HeaderMatchRule
   ): boolean => {
     // Find matching header by key pattern
     const matchingHeaders: string[] = [];
     headers.forEach((value, name) => {
       if (matchHeaderKey(name, rule.key)) {
         matchingHeaders.push(value);
       }
     });

     if (matchingHeaders.length === 0) return false;

     // Test values against pattern(s)
     const patterns = Array.isArray(rule.value) ? rule.value : [rule.value];
     const mode = rule.mode || "any";

     for (const headerValue of matchingHeaders) {
       const results = patterns.map((pattern) =>
         matchHeaderValue(headerValue, pattern)
       );

       if (mode === "all" && results.every(Boolean)) return true;
       if (mode === "any" && results.some(Boolean)) return true;
     }

     return false;
   };

   const matchHeaderConfig = (
     headers: Headers,
     config: HeaderMatchConfig
   ): boolean => {
     const mode = config.mode || "any";
     const results = config.keys.map((rule) => matchHeaderRule(headers, rule));

     return mode === "all" ? results.every(Boolean) : results.some(Boolean);
   };
   ```

2. **Update `matchAppName` function**:

   ```ts
   export const matchAppName = async (
     request: NextRequest
   ): Promise<AppName> => {
     // 1. Existing: Identify by custom header (highest priority)
     const customSetupHeader = request.headers.get(APP_HEADER_NAME);
     if (
       customSetupHeader &&
       customSetupHeader !== "null" &&
       availableApps[customSetupHeader as keyof typeof availableApps]
     ) {
       return customSetupHeader as AppName;
     }

     // 2. NEW: Match by header patterns (second priority)
     for (const [appKey, appConfig] of Object.entries(availableApps)) {
       if (appConfig.match?.header) {
         try {
           if (matchHeaderConfig(request.headers, appConfig.match.header)) {
             console.log(`Header match found for app: ${appKey}`);
             return appKey as AppName;
           }
         } catch (error) {
           console.error(`Header matching error for app ${appKey}:`, error);
         }
       }
     }

     // 3. Existing: Match by URL patterns (lowest priority)
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
             // Regex error handling
           }
         }
       }
     }

     return null;
   };
   ```

### Phase 3: Integration & Testing ⚡

**Goal**: Test and document the new functionality

1. **Manual testing scenarios**:

   - Test with `curl` commands using custom headers
   - Test with multiple header patterns
   - Test precedence order (custom header > header match > URL match)
   - Test error handling for invalid regex patterns

2. **Update Memory Bank documentation**:

   - Add header matching to `FEATURES.md`
   - Update `ARCHITECTURE.md` with new matching priority
   - Document examples in `APP_CONFIG.md` article

3. **Add logging and debugging**:
   ```ts
   // Add debug logging for header matching
   console.log(`Checking header match for app: ${appKey}`, {
     headerConfig: appConfig.match.header,
     requestHeaders: Object.fromEntries(request.headers.entries()),
   });
   ```

### Files to Modify

1. `src/AppConfig.ts` - Type definitions and matching logic
2. `docs/memory-bank/FEATURES.md` - Document new capability
3. `docs/memory-bank/ARCHITECTURE.md` - Update matching priority
4. `docs/articles/APP_CONFIG.md` - Add usage examples

### Example Test Commands

```bash
# Test Authorization header matching
curl -H "Authorization: Bearer my-app1-api-key-secret" http://localhost:3000/

# Test custom app type header
curl -H "X-App-Type: calendar" http://localhost:3000/

# Test multiple headers with regex patterns
curl -H "X-Custom-App: special-value" -H "User-Agent: Mobile" http://localhost:3000/
```

### Error Handling Strategy

- Wrap header matching in try/catch blocks
- Log errors without breaking the matching chain
- Continue to next matching method on header match failure
- Validate regex patterns at startup (optional future enhancement)

## Next Steps

execute task (k2)
