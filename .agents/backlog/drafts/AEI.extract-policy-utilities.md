# Extract Policy Utilities & Refactor Imports [aei]

Separate concerns from the Unified Policy Engine epic: create a shared `util.ts` housing normalization, feature validation, and warnOnce logic; refactor server/client policy evaluators and guards to consume it, deleting duplicate helpers.

## Goals

- [ ] Add `src/42go/policy/util.ts` exporting:
  - `normalizePolicies(p: Policy|Policy[]): Policy[]`
  - `validateFeatureName(feature?: string): { ok: boolean; error?: string }`
  - `warnOnce(key: string, message: string)` (dev-only)
  - `DEV_WARN_PREFIX` constant
- [ ] Replace duplicated helpers (`policyArray`, `toArray`, inline feature prefix checks, ad-hoc warn logic) in:
  - `server.ts`
  - `useEvaluatePolicy.ts`
  - `protectPage.tsx`
  - `protectRoute.ts`
  - `policy/access` (where applicable for feature validation)
- [ ] Ensure no logic change except consolidation (behavior parity with pre-refactor state assuming wildcard already removed in [aeh]).
- [ ] Add one-time dev warnings for: invalid feature prefix, use of experimental `strict`/`strictMode`.
- [ ] Update `Policy` type with JSDoc `@experimental` for `strict` fields if not already present.
- [ ] Remove stray console logs from `protectRoute` (moved to plan here to keep surface minimal).

## Acceptance Criteria

- [ ] `util.ts` exists with specified exports and zero external dependencies beyond std/ local types.
- [ ] All listed files import and use the shared functions (grep shows no leftover `policyArray(` or `toArray(` definitions).
- [ ] Feature prefix validation centralized; identical error detail strings client + server.
- [ ] One-time dev warnings verified (no spam on repeated evaluations).
- [ ] Lint & type checks pass (`npm run qa`).
- [ ] No behavioral regressions (manual smoke per adt plan).
- [ ] Docs (POLICY.md draft if present) mention utility consolidation conceptually (optional pointer).
- [ ] Task `adt` updated to delegate steps 3 & 4 to this task.

## Out of Scope

- Wildcard removal (handled by [aeh]).
- OR helper design (handled by [aef]).
- Test implementation (handled by [aeg]).

## Implementation Plan

1. Create file with utilities; include internal Set for warnOnce keys.
2. Update server evaluator: import utilities, replace local normalization + validation.
3. Update client hook: same replacements.
4. Update guards (`protectPage`, `protectRoute`) to rely on evaluatePolicy return semantics; remove duplicated formatting where possible.
5. Add JSDoc to `Policy` interface fields `strict` / `strictMode`.
6. Remove obsolete helpers and confirm via grep.
7. Run `npm run qa` fix issues.
8. Update adt story (remove direct execution steps, reference aei).
9. Mark progress & close when criteria satisfied.

## Next Steps

plan task (k2) – ready; scope refined with audit findings above.

---

## Findings (Codebase Audit 2025-08-13)

Duplicate / scattered logic identified:

1. Policy array normalization

- `server.ts`: `policyArray()`
- `useEvaluatePolicy.ts`: `toArray()`

2. Feature prefix + existence validation duplicated (nearly identical error/detail strings) in:

- `server.ts` (authoritative + feature set from AppConfig)
- `useEvaluatePolicy.ts` (client, visual)

3. Experimental flags dev warnings duplicated (different keys client/server) in both evaluator paths.
4. Message / failing-value formatting logic duplicated across guards:

- `protectPage.tsx`
- `protectRoute.ts`
  (Both reconstruct failing value -> string; subtle divergence in variable names but same semantics.)

5. `warnOnce` already exists in `warn.ts`. Story original draft proposed relocating it to `util.ts`; relocation would cause churn with no added cohesion (single-purpose file acceptable). Decision: keep `warn.ts`, optionally re-export from `util.ts` for a single import surface.
6. Derive feature helpers:

- Page: inline `derivePageFeature()` in `protectPage.tsx`
- API: inline `deriveApiFeatureFromArgs()` in `protectRoute.ts`
  Both follow similar patterns (path parsing + prefix). Unification is possible but low ROI for now; current differences (args vs headers fallback) are context-specific. Defer consolidation.

7. Access layer (`policy/access/index.ts`) does not perform feature validation today; no change required there (it operates only on role/grant DB checks).

Existing JSDoc `@experimental` notes for `strict` & `strictMode` already present in `types.ts`. Goal item about adding them can shift to "verify present".

## Refined Scope

IN:

- Introduce `policy/util.ts` with: `normalizePolicies`, `validateFeatureName`, `formatPolicyFailure` (new helper to centralize value -> message), re-export of `warnOnce` from `warn.ts`, and `DEV_WARN_PREFIX`.
- Replace local normalization & prefix validation in server + client evaluators.
- Centralize experimental flag warning emission (shared keys) via util.
- Use `formatPolicyFailure` inside both guards to remove duplicated formatting logic while preserving existing semantics (404 for feature, login redirect, etc.).
- Grep-based cleanup ensuring no `policyArray(` or `toArray(` remain.

OUT (Defer):

- Unifying derive feature helpers (different runtime contexts).
- Relocating `warnOnce` implementation (only re-exporting it).
- Changing public API signatures or error shapes.
- Introducing test suite (handled by [aeg]).

## Updated Goals (Rewritten)

- [ ] Add `src/42go/policy/util.ts` exporting:
  - `normalizePolicies(p: Policy|Policy[]): Policy[]`
  - `validateFeatureName(feature?: string): { ok: boolean; error?: string }` (checks prefix + presence of `page:`/`api:`; does NOT check enabled list — server/client keep that context)
  - `formatPolicyFailure(args): { code: string; message: string }` (shared inference of failing value)
  - `DEV_WARN_PREFIX = "[policy]"`
  - `warnOnce` (re-export from `warn.ts`)
- [ ] Refactor `server.ts` & `useEvaluatePolicy.ts` to use `normalizePolicies`, `validateFeatureName`, unified experimental warnings, remove inline prefix code.
- [ ] Refactor `protectPage.tsx` & `protectRoute.ts` to use `formatPolicyFailure` (keep 404 + /login redirect semantics when no override present).
- [ ] Verify `strict` / `strictMode` JSDoc already present; no changes needed beyond maybe harmonizing wording if desired.
- [ ] Ensure no leftover helpers via grep (`policyArray(`, `toArray(`).
- [ ] Keep behavior parity (manual smoke: feature off -> 404, missing session -> /login or 401 depending on surface, role/grant -> 403 JSON or inline error component).
- [ ] Add shared experimental warning keys: `experimental-strict`, `experimental-strictMode` (replace previous distinct server/client keys to avoid duplication).
- [ ] Update `POLICY.md` (add short "Utilities Consolidation" note).

## Acceptance Criteria (Refined)

- [ ] `util.ts` added with listed exports; `warn.ts` left untouched; re-export works.
- [ ] No occurrences of `policyArray(` or `toArray(` in repo post-refactor.
- [ ] Guards import and use `formatPolicyFailure`; diff shows removal of duplicated formatting code blocks.
- [ ] Experimental warnings fire once (manual double invocation check) with unified keys.
- [ ] Lint & type pass (`npm run qa`).
- [ ] POLICY.md updated with small section referencing utility extraction.
- [ ] No runtime behavior changes (spot-check 3 scenarios: missing feature, missing session, missing grant).
- [ ] Task [adt] cross-referenced (append note that utility extraction completed here).

## Risks / Edge Cases

- Risk: Centralizing formatting may accidentally change messages (ensure snapshot of current strings preserved).
- Edge: Feature inference for root page `/` intentionally returns null → no default feature requirement (don't alter).
- Edge: API path parsing with/without explicit `/api` segment fallback — keep current precedence.
- Edge: Client-side evaluation must not throw if `feature` invalid; still short-circuits with error.
- Edge: Ensure re-export of `warnOnce` does not create circular import (util must import from `./warn`).

## Open Questions

- Should we also centralize derive helpers? (Proposed answer: defer; minimal benefit now.)
- Should `validateFeatureName` also enforce membership of enabled features? (Answer: No; membership requires app context, stays where it is.)

## Updated Next Steps

Execute planning → "plan task (k2)" remains. After planning, implement as per refined scope.

## Development Plan

Implementation Contract:

- Input: Existing policy-related modules (`server.ts`, `useEvaluatePolicy.ts`, `protectPage.tsx`, `protectRoute.ts`, `types.ts`, `warn.ts`).
- Output: New `util.ts` module centralizing normalization, feature name validation, failure formatting, experimental warnings (via re-exported `warnOnce`).
- Non-Goals: Changing runtime semantics, unifying derive feature helpers, adding tests (future story), moving `warnOnce` implementation.

Planned Steps (granular):

1. Create `src/42go/policy/util.ts`:

- `export const DEV_WARN_PREFIX = "[policy]"`.
- `export const normalizePolicies = (p: Policy|Policy[]): Policy[]`.
- `export const validateFeatureName(feature?: string)` → prefix check only; returns `{ ok: boolean; error?: string }`.
- `export interface FormatFailureArgs { errorCode: PolicyErrorCode; failingPolicy: Policy; resultDetail?: string; override?: Policy['onFail']|Policy['onError']; }`.
- `export const formatPolicyFailure(args): { code: string; message: string; failingValue?: unknown }` replicating current value→string logic (array join, string passthrough, fallback to detail/code) WITHOUT altering special-case semantics (session => "login required").
- Re-export `warnOnce` from `./warn`.
- Provide helper `emitExperimentalWarnings(policy)` using unified keys `experimental-strict`, `experimental-strictMode`.

2. Refactor `server.ts`:

- Remove `policyArray`.
- Use `normalizePolicies` for early expansion.
- Use `validateFeatureName` and if invalid, produce same error object & dev warning via `warnOnce` (key: `feature-prefix`).
- Replace experimental warning blocks with `emitExperimentalWarnings`.
- Keep enabled-feature membership check (distinct responsibility) after prefix validation.

3. Refactor `useEvaluatePolicy.ts`:

- Remove `toArray` function.
- Import `normalizePolicies`, `validateFeatureName`, `emitExperimentalWarnings`, `warnOnce`.
- Apply same feature prefix flow (no membership change) + dev warning keys unified (`feature-prefix`).

4. Refactor guards:

- `protectPage.tsx` & `protectRoute.ts`: Extract duplicated value/message formatting.
- Import and invoke `formatPolicyFailure` for default inferred message.
- Preserve existing override precedence (redirect > render > default logic).
- Ensure default 404 (feature) and login redirect (session) semantics remain when no override.

5. JSDoc verification:

- Confirm `types.ts` already contains experimental comments; adjust wording only if misaligned (skip if adequate).

6. Update `POLICY.md`:

- Add a short section: "Utility Consolidation" listing `normalizePolicies`, `validateFeatureName`, `formatPolicyFailure`, and unified dev warning keys.

7. Update `adt` story:

- Append note under Out of Scope or progress: utility extraction completed by [aei].

8. Cleanup / Verification:

- Grep for `policyArray(` and `toArray(` expecting 0 results.
- Grep for old experimental warning keys (`strict-flag`, `strict-flag-client`, etc.) ensuring removal.

9. Quality Gates:

- Run `npm run qa` and resolve lint/type issues.

10. Manual Smoke (document briefly in Progress when executed):

- Page with disabled feature → 404.
- Page requiring session when logged out → redirect /login.
- API route requiring grant when missing → 403 JSON with expected shape.
- Confirm dev warnings appear once each (prefix + strict) after server/client evaluation.

11. Update task file sections: Progress, Issues Encountered (if any), Architectural Decisions (if wording of JSDoc changed).

Edge Cases Checklist:

- Root page inference unaffected (no feature inferred for `/`).
- API path parsing unaffected (still context-specific functions).
- No circular import between `util.ts` and `warn.ts` (one-way import only).

Rollback Strategy:

- Revert individual file changes if behavior regression detected; `util.ts` addition is isolated—removal restores previous distributed logic.

Success Metrics:

- Zero diff in runtime responses for identical inputs (manual spot-check).
- Single emission of each dev warning per process lifetime.

## Next Steps (Updated)

execute task (k2)
