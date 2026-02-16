# Upgrade project to latest major versions [aqe]

Upgrade the project dependencies to their latest major versions, including Next.js 16, ESLint 10, and other breaking updates. This task captures considerations, risks, and a phased approach to ensure stability.

## Context

As of 2026-02-16, the project has been updated to latest minor/patch versions with all security vulnerabilities resolved:
- Next.js 15.5.12 (latest secure 15.x)
- React 19.2.4
- TypeScript 5.9.3
- ESLint 9.39.2
- All other dependencies current within their semver ranges

The following major version updates are available but require breaking changes:

### Available Major Upgrades

| Package | Current | Latest | Impact |
|---------|---------|--------|--------|
| next | 15.5.12 | 16.1.6 | HIGH - Framework core, likely API changes |
| eslint-config-next | 15.3.3 | 16.1.6 | HIGH - Requires Next.js 16 |
| eslint | 9.39.2 | 10.0.0 | MEDIUM - Linting rules may change |
| @types/node | 20.19.33 | 25.2.3 | MEDIUM - Type definitions for Node.js |
| uuid | 11.1.0 | 13.0.0 | LOW - Utility library |
| @dnd-kit/sortable | 8.0.0 | 10.0.0 | MEDIUM - Drag & drop in QuickList |
| @types/bcrypt | 5.0.2 | 6.0.0 | LOW - Type definitions only |
| dotenv | 16.6.1 | 17.3.1 | LOW - Dev dependency |
| lucide-react | 0.514.0 | 0.564.0 | LOW - Icon library (minor jump) |

## Goals

- [ ] Evaluate each major version upgrade for breaking changes
- [ ] Create a phased upgrade plan with testing checkpoints
- [ ] Document migration steps and code changes needed
- [ ] Ensure all features continue working after upgrades
- [ ] Update documentation for any new patterns or requirements

## Considerations & Risks

### Next.js 15 → 16

**High Priority - Framework Core**

Known considerations from Next.js 15.5.12:
- `next lint` is deprecated (migrate to ESLint CLI using codemod)
- Stricter Suspense boundaries for client hooks (already fixed for useSearchParams)
- Middleware execution changes (currently working)

Potential Next.js 16 breaking changes (need investigation):
- App Router changes or new conventions
- Server Actions API changes
- Image optimization API changes
- Middleware API changes
- Caching behavior changes
- Build output structure changes

**Risk**: This is the core framework. Breaking changes could affect:
- All pages and routes
- Authentication flow (NextAuth integration)
- API routes
- Middleware (app ID matching)
- Dynamic pages system
- Build/deployment process

**Mitigation**:
- Review Next.js 16 upgrade guide thoroughly
- Test in a separate branch
- Verify all critical user flows
- Check Docker build compatibility

### ESLint 9 → 10

**Medium Priority - Tooling**

Potential impacts:
- New or changed linting rules
- Plugin compatibility (eslint-config-next, TypeScript ESLint)
- Configuration format changes
- Build/CI pipeline changes

**Risk**: Could break existing lint rules or require code refactoring.

**Mitigation**:
- Review ESLint 10 migration guide
- Update all ESLint plugins simultaneously
- Run full lint pass and fix issues
- Consider disabling new strict rules initially

### @types/node 20 → 25

**Medium Priority - Type System**

Potential impacts:
- Node.js API type changes
- Breaking type definitions for built-in modules
- TypeScript compilation errors
- Server-side code type mismatches

**Risk**: Could cause TypeScript compilation failures requiring code changes.

**Mitigation**:
- Ensure Node.js runtime version supports types (currently using Node 18+)
- Review changelog for breaking type changes
- Fix type errors progressively
- Consider if project should also upgrade Node.js runtime

### @dnd-kit/sortable 8 → 10

**Medium Priority - Feature Specific**

Impacts:
- QuickList task reordering functionality
- Drag & drop UI interactions

**Risk**: Could break task reordering in QuickList feature.

**Mitigation**:
- Review @dnd-kit changelog for v9 and v10
- Test QuickList reordering extensively
- Check for API changes in drag events
- Test on mobile/touch devices

### Low Priority Packages

**uuid, @types/bcrypt, dotenv, lucide-react**

Lower risk but should still be tested:
- uuid: Basic utility, likely minimal changes
- @types/bcrypt: Dev types only
- dotenv: Dev tool for local development
- lucide-react: Icon library, should be straightforward

## Proposed Phased Approach

### Phase 1: Low-Risk Updates (Recommended First)

Update packages with minimal breaking change risk:

```bash
npm install uuid@13.0.0
npm install lucide-react@0.564.0
npm install --save-dev @types/bcrypt@6.0.0
npm install --save-dev dotenv@17.3.1
```

**Test**: Basic functionality, build, lint
**Rollback**: Easy - just revert package.json changes

### Phase 2: @dnd-kit Update

Update drag & drop library:

```bash
npm install @dnd-kit/sortable@10.0.0
```

**Test**:
- QuickList task creation and reordering
- Drag and drop on desktop
- Touch interactions on mobile
- Task position persistence

**Rollback**: Medium difficulty - may need code changes

### Phase 3: TypeScript & Node Types

Update type definitions:

```bash
npm install --save-dev @types/node@25
```

**Test**:
- TypeScript compilation (`tsc --noEmit`)
- Build process
- Server-side API routes
- Database operations

**Rollback**: Easy if no code changes made

### Phase 4: ESLint 10

Update linting infrastructure:

```bash
npm install --save-dev eslint@10
```

**Test**:
- `npm run lint` passes
- CI/CD pipeline
- Pre-commit hooks (if any)

**Rollback**: Easy - tooling only

### Phase 5: Next.js 16 (Most Complex)

**IMPORTANT**: This should be done last and with significant testing.

Pre-upgrade steps:
1. Review Next.js 16 upgrade guide and changelog
2. Check NextAuth compatibility with Next.js 16
3. Review middleware changes
4. Check for codemods

Upgrade:

```bash
# Run Next.js codemod if available
npx @next/codemod@canary upgrade

# Or manual upgrade
npm install next@16.1.6 eslint-config-next@16.1.6
```

**Test Extensively**:
- [ ] All pages render correctly
- [ ] Authentication flow (login, logout, session)
- [ ] Social logins (GitHub, Google)
- [ ] Protected routes and middleware
- [ ] API routes (all endpoints)
- [ ] QuickList full workflow
- [ ] Notes feature
- [ ] Calendar feature
- [ ] Docs rendering
- [ ] Dynamic pages
- [ ] Theme switching
- [ ] Build process (`npm run build`)
- [ ] Production mode (`npm start`)
- [ ] Docker build and runtime
- [ ] Environment-based app matching

**Rollback**: Complex - may require significant code changes to revert

## Pre-Flight Checklist

Before starting any upgrades:

- [ ] Create a new branch: `git checkout -b upgrade/major-versions`
- [ ] Ensure all tests pass on current version
- [ ] Document current behavior for regression testing
- [ ] Backup package-lock.json
- [ ] Ensure DATABASE_URL is set for local testing
- [ ] Clear `.next` and `node_modules` before testing

## Testing Strategy

### Automated Tests
- [ ] Run existing test suite (if available)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] TypeScript compilation (`tsc --noEmit`)

### Manual Testing Checklist

**Authentication:**
- [ ] Login with credentials
- [ ] Login with GitHub OAuth
- [ ] Login with Google OAuth
- [ ] Logout
- [ ] Session persistence
- [ ] Protected route access

**QuickList:**
- [ ] View project list
- [ ] Create new project
- [ ] View project tasks
- [ ] Add new tasks
- [ ] Reorder tasks (drag & drop)
- [ ] Complete tasks
- [ ] Delete tasks
- [ ] Delete project
- [ ] Invite collaborators
- [ ] Accept invites
- [ ] Drop completed tasks

**Other Features:**
- [ ] Notes CRUD operations
- [ ] Calendar view
- [ ] Docs navigation and rendering
- [ ] Theme switching (light/dark)
- [ ] Profile page
- [ ] User menu

**Build & Deploy:**
- [ ] Development server (`npm run dev`)
- [ ] Production build (`npm run build`)
- [ ] Production server (`npm start`)
- [ ] Docker build (`docker-compose up`)
- [ ] Environment variable loading

## Known Issues to Watch

### Next.js 15.5.12 Already Fixed:
- ✅ useSearchParams requires Suspense boundary (fixed in login page)

### Potential Next.js 16 Issues:
- ESLint integration changes (migrate from `next lint`)
- Middleware execution in standalone builds
- Server Actions changes
- Caching behavior changes

## Rollback Plan

If issues are encountered:

1. **Immediate rollback:**
   ```bash
   git checkout package.json package-lock.json
   npm install
   rm -rf .next node_modules
   npm install
   ```

2. **Partial rollback:**
   - Identify problematic package
   - Revert to previous version
   - Document issue for future attempt

3. **Document blockers:**
   - Create detailed issue notes
   - Link to upstream issue tracker
   - Set reminder to retry after upstream fixes

## Success Criteria

- [ ] All major dependencies upgraded to latest versions
- [ ] Zero security vulnerabilities
- [ ] All automated tests pass
- [ ] All manual test scenarios pass
- [ ] Build completes successfully
- [ ] Application runs in development mode
- [ ] Application runs in production mode
- [ ] Docker build and runtime work correctly
- [ ] No console errors or warnings (except expected)
- [ ] Documentation updated for any new patterns

## Resources & References

**Next.js:**
- https://nextjs.org/docs/app/getting-started/upgrading
- https://github.com/vercel/next.js/releases
- Next.js 16 upgrade guide (check when available)

**ESLint:**
- https://eslint.org/docs/latest/use/migrate-to-10.0.0
- https://github.com/eslint/eslint/releases/tag/v10.0.0

**@dnd-kit:**
- https://github.com/clauderic/dnd-kit/releases
- https://docs.dndkit.com/

**TypeScript & Node:**
- https://github.com/DefinitelyTyped/DefinitelyTyped
- Node.js compatibility matrix

## Notes

- This upgrade was deferred during the 2026-02-16 security update to minimize risk
- Current versions are secure and stable
- Major version upgrades should be scheduled during low-traffic periods
- Consider user impact and schedule appropriately
- Budget 2-4 hours for Phase 5 (Next.js 16) testing alone

## Related Issues

- Depends on: Docker build working correctly (see `aem-fix-docker-build.md`)
- May affect: Authentication flows, RBAC policies, all features
- Consider: Node.js runtime upgrade to v20 LTS (current minimum is v18)

## Estimated Effort

- Phase 1 (Low-risk): 30 minutes
- Phase 2 (@dnd-kit): 1 hour
- Phase 3 (Types): 1-2 hours
- Phase 4 (ESLint): 1 hour
- Phase 5 (Next.js 16): 4-8 hours
- **Total: 1-2 days** (including testing and documentation)

## Timeline Recommendation

**When to upgrade:**
- After critical features are stable
- During a planned maintenance window
- When Next.js 16 has been out for at least 1-2 months (stability)
- When key dependencies (NextAuth, etc.) confirm Next.js 16 support

**When NOT to upgrade:**
- During active feature development
- Right before a major release
- When team bandwidth is limited
- If Docker middleware issue (aem) is not yet resolved

## Decision

- [ ] Proceed with phased upgrade
- [ ] Defer until specific date: __________
- [ ] Defer until condition met: __________
- [ ] Skip (document reason): __________
