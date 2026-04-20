# Move `config.docs` to `config.public.docs` [acd]

Move the documentation configuration from `config.docs` to `config.public.docs` to align with the new public config structure.

## Goals

- [ ] Identify all usages of `config.docs`
- [ ] Move the configuration to `config.public.docs`
- [ ] Refactor codebase to use the new location
- [ ] Test and verify functionality

## Acceptance Criteria

- [ ] All references to `config.docs` are updated to `config.public.docs`
- [ ] No breaking changes
- [ ] Documentation is updated

## Development Plan

Chuck Norris doesn't plan. He executes with precision. But here's the battle plan anyway:

1. Search the codebase for all references to `config.docs`.
2. Move the documentation config from `config.docs` to `config.public.docs` in the relevant config files.
3. Refactor all code to use `config.public.docs` instead of `config.docs`.
4. Update any documentation that references the old location.
5. Test the app. If it breaks, roundhouse kick the bugs until they beg for mercy.

**Files to modify:**

- App config files (likely in `src/config/` or `src/AppConfig.ts`)
- Any code using `config.docs` (search entire `src/`)
- Documentation in `docs/` if it references `config.docs`

**Libraries/Tools:**

- No new libraries needed. Just pure Chuck Norris power.
- Use `npm run lint && npm run build` to check for errors after refactor.

**Additional Considerations:**

- Make sure no breaking changes slip through. Chuck Norris doesn't tolerate weakness.
- If you find edge cases, handle them like a true legend.

## Next Steps

Execute task (k2)
