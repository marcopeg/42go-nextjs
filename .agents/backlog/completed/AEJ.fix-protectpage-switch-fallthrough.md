# Fix protectPage Switch Fall-Through Bug [aej]

The `protectPage` guard's switch statement lacks breaks/returns, causing fall-through and incorrect redirects. A feature error cascades through session/role/grant/default resulting in unintended redirects.

## Problem

File: `src/42go/policy/protectPage.tsx`
Current snippet:

```
        switch (result.error?.code) {
          case "feature":
            notFound();
          case "session":
            redirect("/login");
          case "role":
          case "grant":
            redirect("/unauthorized");
          default:
            notFound();
        }
```

Missing breaks/returns → first matched branch continues executing subsequent ones.

## Goals

- Ensure exactly one action is taken per error code.
- Preserve semantics: feature -> 404 (notFound), session -> login redirect, role/grant -> unauthorized redirect, default -> 404.
- Keep logic explicit & readable.
- Add a default clause guarding unexpected codes.
- Add lightweight testable helper (optional) or inline early returns.

## Acceptance Criteria

- [x] Switch logic updated with explicit `return` (preferred) or `break` after each branch.
- [ ] Feature failure results in 404 (no redirect) confirmed via manual smoke.
- [ ] Session failure redirects only to /login (no unauthorized cascade).
- [ ] Role/grant failure redirects only to /unauthorized.
- [ ] Unexpected code path still results in 404.
- [x] No stray console logs introduced.
- [x] Task file updated with final diff snippet.

## Implementation Plan

1. Edit `protectPage.tsx`:
   - Replace switch with if/else or add early returns:

```
if (!result.pass) {
  const code = result.error?.code;
  if (code === 'feature') return notFound();
  if (code === 'session') return redirect('/login');
  if (code === 'role' || code === 'grant') return redirect('/unauthorized');
  return notFound();
}
```

2. Run `npm run qa` to ensure no lint/type errors.
3. Manual smoke:
   - Visit a page with disabled feature -> 404.
   - Visit a page requiring session while logged out -> login redirect.
   - Visit a page requiring role/grant lacking it -> unauthorized redirect.
4. Update this file (Results section) with findings & mark checklist.

## Development Plan

### 1. Code Change Strategy

- Keep edit surgical: only touch `protectPage.tsx`.
- Replace brittle switch (implicit fall-through) with ordered early-return `if` chain.
- Rationale: `notFound()` & `redirect()` throw in Next.js; returning them is explicit, halts execution, keeps TS satisfied.
- Preserve existing comments semantics (401/403 notes) for clarity.

### 2. Proposed Patch (illustrative)

```ts
// Before: switch (...)
// After:
if (!result.pass) {
  const code = result.error?.code;
  if (code === "feature") return notFound(); // 404 Missing/disabled feature
  if (code === "session") return redirect("/login");
  if (code === "role" || code === "grant") return redirect("/unauthorized");
  return notFound(); // Fallback safety
}
```

### 3. Edge Cases Considered

- Undefined `result.error` → `code` is undefined → fallback 404.
- Unknown code string → fallback 404.
- Multiple errors: evaluator supplies single code; no change required.
- No policy (undefined) → guard skipped → original behavior unchanged.

### 4. Manual Verification Matrix

| Scenario           | Setup                                              | Expected             | Mechanism        |
| ------------------ | -------------------------------------------------- | -------------------- | ---------------- |
| Disabled feature   | Remove feature from AppConfig.features, visit page | 404                  | First if branch  |
| No session         | Logout / incognito, visit protected page           | 302 -> /login        | Second if branch |
| Missing role       | Auth user w/o required role, visit page            | 302 -> /unauthorized | Third if branch  |
| Missing grant      | Auth user missing grant                            | 302 -> /unauthorized | Third if branch  |
| Unknown error code | Simulate by temporarily forcing code               | 404                  | Fallback         |

### 5. Quality Gates

- Run `npm run qa` (lint + build) after patch.
- Ensure no new warnings introduced.

### 6. Documentation Update

- Paste final diff snippet into Results.
- Tick acceptance checklist.

### 7. Rollback Plan

- `git checkout -- src/42go/policy/protectPage.tsx` (single-file revert) if regression.

### 8. Risks & Mitigation

- Risk: Missed branch due to typo → mitigated by manual matrix.
- Risk: Future codes added not handled → fallback 404 still safe; consider future TODO to centralize mapping.

## Next Steps

execute task (k2)

## Out of Scope

- Utility extraction.
- Wildcard removal logic.
- OR helper design.
- Test suite (covered by broader testing story).

## Risks

- Minimal; change isolated to one file.

## Rollback

Revert the single file change if unexpected behavior emerges.

## Results (fill after execution)

- Diff snippet:

```diff
@@ src/42go/policy/protectPage.tsx @@
-        switch (result.error?.code) {
-          case "feature":
-            // 404 semantics for missing/disabled features
-            notFound();
-          case "session":
-            // 401 → send to login
-            redirect("/login");
-          case "role":
-          case "grant":
-            // 403 → send to app unauthorized page
-            redirect("/unauthorized");
-          default:
-            notFound();
-        }
 +        const code = result.error?.code;
 +        // Map policy evaluation error codes to Next.js navigation outcomes.
 +        // Use early returns to avoid accidental fall-through / multiple actions.
 +        if (code === "feature") return notFound(); // 404 semantics for missing/disabled features
 +        if (code === "session") return redirect("/login"); // 401 → send to login
 +        if (code === "role" || code === "grant")
 +          return redirect("/unauthorized"); // 403 → unauthorized page
 +        return notFound(); // Fallback safety for unexpected / undefined codes
```

- Smoke test notes: PENDING manual verification
- Checklist updated.
