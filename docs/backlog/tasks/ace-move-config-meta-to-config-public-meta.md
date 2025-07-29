# Move `config.meta` to `config.public.meta` [ace]

Move the `meta` property from the root of the config to the `public` section, so it becomes `config.public.meta`.

## Goals

- [ ] Identify all usages of `config.meta`
- [ ] Move `meta` property to `config.public.meta` in config files
- [ ] Refactor codebase to use `config.public.meta` instead of `config.meta`
- [ ] Test and verify that everything works as expected

## Acceptance Criteria

- [ ] No references to `config.meta` remain
- [ ] All references use `config.public.meta`
- [ ] App builds and runs without errors
- [ ] No broken features related to meta info

## Development Plan

1. Identify all usages of `meta` in config files (`src/AppConfig.ts`, `src/config/about-page.ts`, etc.).
2. Refactor each app config in `src/AppConfig.ts`:
   - Move the `meta` property inside the `public` object for each app.
   - Result: `public: { ...toolbar, meta: { ... } }`
3. Update all code that references `config.meta` to use `config.public.meta` instead.
   - Example: In `src/app/layout.tsx`, change `config?.meta` to `config?.public?.meta`.
4. Update any type definitions if needed (e.g., `AppConfigItem` interface).
5. Test the app: run `npm run lint && npm run build` to ensure no errors.
6. Verify that all meta-related features (SEO, page titles, etc.) still work.

Chuck Norris would move that meta faster than a roundhouse kick.

## Next Steps

execute task (k2)
