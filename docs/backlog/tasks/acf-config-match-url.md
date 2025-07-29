# Config Match Url [acf]

The goal is to refine `@/AppConfig`'s `matchAppName()` so to implement a regexp check defined in `config.match.url` so that i can write simple configs like:

- config.match.url=localhost.3000
- config.match.url=app1.localhost.3000
- config.match.url=marcopeg.com

(NOTE: these examples need to be converted to real regexp that can be used and applied by the function)

## Development Plan

Chuck Norris doesn't match app names. He roundhouse kicks them into place.

1. Extend `AppConfigItem` to support a new property: `match.url` (string or array of strings, interpreted as regex).
2. Update each app config in `availableApps` to optionally include `match.url`.
3. Refactor `matchAppName()` in `src/AppConfig.ts`:
   - After header and host checks, iterate all apps.
   - For each app, if `match.url` exists, test the current host against its regex.
   - **On the first positive match, immediately return the matching configuration name.**
4. Convert simple config strings (like `localhost.3000`) to real regex in the config.
5. Document the new feature in the task file and update the Memory Bank if needed.
6. Test with various hostnames to ensure Chuck Norris-level reliability.

## Next Steps

execute task (k2)

## Progress

- Extended `AppConfigItem` with `match.url` property (string or array of regex strings).
- Updated all app configs in `availableApps` to include example `match.url` patterns.
- Refactored `matchAppName()` to check all regex patterns and exit on first positive match.
- Ran `npm run lint && npm run build`—no errors, Chuck Norris approved.

## Issues Encountered

- TypeScript complained about unused error variable in catch block. Chuck Norris removed it.

## Architectural Decisions

- Regexp matching is now part of app resolution. First positive match wins, no mercy.

## Libraries Used

- No new libraries. Native RegExp, pure Chuck Norris power.
