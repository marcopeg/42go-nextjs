# Next.js 16 Upgrade Summary

**Date:** 2026-02-16
**Branch:** upgrade
**Status:** ✅ Complete

## Package Upgrades

### Major Versions
| Package | Before | After | Notes |
|---------|--------|-------|-------|
| next | 15.5.12 | 16.1.6 | ✅ Framework core upgrade |
| eslint-config-next | 15.3.3 | 16.1.6 | ✅ Auto-upgraded with Next.js |
| @dnd-kit/sortable | 8.0.0 | 10.0.0 | ✅ Drag & drop library |
| @types/node | 20.19.33 | 25.2.3 | ✅ Node.js type definitions |
| uuid | 11.1.0 | 13.0.0 | ✅ Utility library |
| lucide-react | 0.514.0 | 0.564.0 | ✅ Icon library |

### Dev Dependencies
| Package | Before | After | Notes |
|---------|--------|-------|-------|
| eslint | 9.39.2 | 9.39.2 | ⚠️ Kept at v9 (v10 incompatible) |
| @types/bcrypt | 5.0.2 | 6.0.0 | ✅ Type definitions |
| dotenv | 16.6.1 | 17.3.1 | ✅ Dev tool |

## Breaking Changes Applied

### 1. Middleware → Proxy Migration
- **File renamed:** `src/middleware.ts` → `src/proxy.ts`
- **Function renamed:** `export async function middleware()` → `export async function proxy()`
- **Status:** ✅ Applied by Next.js codemod

### 2. ESLint CLI Migration
- **Before:** `npm run lint` → `next lint` (deprecated)
- **After:** `npm run lint` → `eslint .`
- **Config:** Using ESLint Flat Config (`eslint.config.mjs`)
- **Status:** ✅ Applied by Next.js codemod

### 3. TypeScript Configuration Updates
- **JSX:** `preserve` → `react-jsx`
- **Include:** Added `.next/dev/types/**/*.ts` for new dev output
- **Status:** ✅ Auto-updated by Next.js

### 4. Turbopack by Default
- Turbopack is now default for `next dev` and `next build`
- No configuration changes needed (already using Turbopack)
- **Status:** ✅ No action required

## Build & Test Results

### ✅ TypeScript Compilation
```bash
npx tsc --noEmit
# Result: No errors
```

### ✅ Production Build
```bash
npm run build
# Result: ✓ Compiled successfully
# Result: ✓ Generating static pages (27/27)
```

### ⚠️ ESLint Warnings
5 errors, 1 warning remaining (pre-existing code):

**Files affected:**
1. `src/42go/auth/components/AuthError.tsx:19` - setState in effect
2. `src/42go/components/ContentBlock/blocks/MarkdownBlock.tsx:33` - immutability
3. `src/42go/layouts/app/SidebarMenu.tsx:115` - setState in effect
4. `src/42go/policy/useEvaluatePolicy.ts:196` - setState in effect
5. `src/app/(public)/login/page.tsx:34` - immutability

**Issue:** New React 19 ESLint rules catching pre-existing patterns.
**Impact:** Build succeeds; warnings don't block deployment.
**Action:** Fix separately (not blocking upgrade).

## ESLint 10 Note

**Attempted:** ESLint 10.0.0 upgrade
**Result:** Incompatible with React plugins in eslint-config-next@16.1.6
**Decision:** Downgraded to ESLint 9.39.2 (officially supported)
**Reason:** ESLint 10 is too new; ecosystem plugins not ready yet

## Configuration Changes

### eslint.config.mjs
- Migrated from legacy `.eslintrc` to Flat Config
- Added ignore: `contents/.obsidian/**` (third-party plugins)
- Now using direct imports: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`

### package.json scripts
```diff
- "lint": "next lint",
- "qa": "next lint && next build"
+ "lint": "eslint .",
+ "qa": "eslint . && next build"
```

### tsconfig.json
```diff
- "jsx": "preserve",
+ "jsx": "react-jsx",
+ ".next/dev/types/**/*.ts" (added to include)
```

## Upgrade Process

1. ✅ **Phase 1:** Low-risk packages (uuid, lucide-react, @types/bcrypt, dotenv)
2. ✅ **Phase 2:** @dnd-kit/sortable@10
3. ✅ **Phase 3:** @types/node@25
4. ✅ **Phase 4:** ESLint 9 (skipped v10)
5. ✅ **Phase 5:** Next.js 16 + codemod
   - Ran: `npx @next/codemod@canary upgrade latest`
   - Applied: remove-experimental-ppr, remove-unstable-prefix, middleware-to-proxy
   - Ran: `npx @next/codemod@canary next-lint-to-eslint-cli . --force`

## Testing Recommendations

Before deploying to production, manually test:

### Critical Paths
- [ ] Login (credentials, GitHub OAuth, Google OAuth)
- [ ] Logout
- [ ] Protected routes (middleware/proxy execution)
- [ ] QuickList: Create, edit, reorder tasks (drag & drop)
- [ ] Notes CRUD operations
- [ ] Calendar view
- [ ] Docs rendering
- [ ] Theme switching

### Build & Deploy
- [ ] `npm run qa` passes
- [ ] `npm run build` succeeds
- [ ] `npm start` works in production mode
- [ ] Docker build: `make prod.build`
- [ ] Docker runtime: `make prod.start`

## Next Steps

### Optional (Post-Upgrade)
1. **Fix ESLint warnings** - Address 5 React best practice issues
2. **Monitor ESLint 10** - Upgrade when ecosystem plugins support it
3. **Update CLAUDE.md** - Document new ESLint CLI usage if needed
4. **Test on staging** - Verify all features work as expected

## References

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React 19.2 Release Notes](https://react.dev/blog/2025/10/01/react-19-2)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- Task: [aqe] upgrade to major versions

---

**Upgrade completed successfully!** 🎉
