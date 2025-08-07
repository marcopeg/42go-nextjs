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

### Phase 1: Type System Extension

1. Extend `AppConfigItem.match` interface with header configuration
2. Update existing app configs with example header matching
3. Add type safety and validation

### Phase 2: Core Implementation

1. Add header matching logic to `matchAppName` function
2. Implement string vs regex detection and matching
3. Implement list matching with mode support
4. Add proper error handling and logging

### Phase 3: Integration & Testing

1. Integrate with existing URL-based matching
2. Test with various header combinations
3. Document the new feature in Memory Bank
4. Update API documentation

## Next Steps

refine task (k4)
