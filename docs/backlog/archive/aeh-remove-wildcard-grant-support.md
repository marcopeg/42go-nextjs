# Remove Wildcard Grant Support [aeh]

Simplify grant evaluation to strict literal matching only; delete any pattern / regex code, tests, docs references; treat `*` as an ordinary character with no warnings.

## Goals

- [x] Identify and remove any residual wildcard / pattern matching logic (server + client).
- [x] Ensure grant checks use simple literal membership only.
- [x] Delete or refactor helpers solely used for wildcard logic.
- [x] Update docs (POLICY.md draft / references) to explicitly state no wildcard support.
- [x] Update test matrix references (adt / aeg) to replace wildcard pass case with literal-fail case.
- [x] Grep codebase to verify no leftover regex-based grant evaluation remains.
- [x] Maintain existing public API (no breaking changes to policy shape beyond behavior removal already agreed).
- [x] Zero runtime or dev warnings related to `*` usage.

## Non-Goals

- Changing policy shape or adding new grant semantics.
- Introducing OR / composite helpers (separate stories).
- Expanding session strict modes.

## Acceptance Criteria

- [x] No function or variable names like `matchesWildcard`, `wildcard`, `patternGrant` remain in `src/`.
- [x] Access layer grant resolution uses only exact string comparison.
- [x] Client hook grant resolution mirrors server logic (no patterns).
- [x] Docs: Any wildcard examples removed or converted to literal examples causing failure.
- [x] Task `adt` updated to remove execution of wildcard removal (now delegated here) and reference this task.
- [x] QA run passes (lint/type/build) after removals.
- [x] No regex construction for grant matching (removed `matchesPattern`, no `new RegExp` in grant checks).
- [x] Updated seed comment no longer references runtime wildcard support.
- [x] Test strategy task `[aeg]` reflects literal-only matching.

## Progress

- Server: Removed `matchesPattern` and all wildcard logic from `src/42go/policy/access/index.ts`.
- Client: Removed RegExp grant logic from `src/42go/policy/useEvaluatePolicy.ts`.
- Seeds: Updated comment in `knex/seeds/20240522_init_auth_data.js` to reflect literal-only semantics.
- Docs: Updated `RBAC.md` to clarify wildcard removal; verified `POLICY.md` already correct.
- Greps: All verification greps pass (no wildcard logic remains).
- QA: Lint, typecheck, and build all pass with no errors.

Task complete. Ready to close (k4).

## Out of Scope

- OR / anyPolicy semantics (handled by [aef]).
- Broader refactors (central utility extraction lives in adt unless strictly tied to wildcard code).

## Implementation Sketch

1. Search for wildcard helpers: grep `wildcard\|pattern\|matchesWildcard` under `src/42go/policy`.
2. Remove helper + call sites; inline simple literal checks (`grants.includes(g)` or Set lookups).
3. Update any conditional branches predicated on pattern detection.
4. Adjust docs/test matrix lines.
5. Run `npm run qa`.
6. Update this file with progress & close when criteria met.

## Current Wildcard Logic Inventory

| Location                                                                               | Pattern Logic Present              | Action                                                                |
| -------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `src/42go/policy/access/index.ts` (`matchesPattern`, `g.includes("*") ? ...`)          | Yes                                | Delete function, simplify `every`/`some` checks to direct `.includes` |
| `src/42go/policy/useEvaluatePolicy.ts` (client grants checks build RegExp)             | Yes                                | Remove regex path; direct `.includes` only                            |
| `knex/seeds/20240522_init_auth_data.js` comment about wildcards                        | Comment only                       | Update comment to state wildcards are treated literally               |
| `docs/articles/POLICY.md`                                                              | Already states no wildcard support | Verify stays accurate after code removal                              |
| Task files referencing historical wildcard support (e.g. `acr-client-page-wrapper.md`) | Legacy mention                     | Optionally annotate deprecated if still relevant                      |

## Detailed Removal Plan

1. Server Access Layer
   - Delete `matchesPattern` in `access/index.ts`.
   - Replace `g.includes("*") ? userGrants.some(...) : userGrants.includes(g)` with just `userGrants.includes(g)` in both `grantsAll` and `grantsAny` blocks.
   - Remove comment `// Wildcard matching identical to legacy implementation`.
2. Client Hook
   - In `useEvaluatePolicy.ts`, remove both regex-building branches inside grants / anyGrant sections.
   - Simplify to direct `.includes` checks.
3. Seeds
   - Edit comment to reflect literal-only semantics (or remove if redundant).
4. Docs
   - Re-skim `POLICY.md` & `RBAC.md` (if any wildcard traces) and purge examples using `*` (none expected now).
5. Cross-Task Adjustments
   - Update `[adt]` (already delegating) only if it still contains an internal note about wildcard execution (verify; appears delegated already).
   - Ensure `[aeg]` test plan excludes wildcard scenarios; replace with literal negative test.
6. Quality Gates
   - Run `npm run qa` after edits. Fix lint/types.
7. Verification Greps
   - `grep -R "matchesPattern" src` → 0.
   - `grep -R "RegExp(.*grant" src/42go/policy` → 0.
   - `grep -R "\\*" src/42go/policy/access` should show no conditional logic around star.
8. Add Progress notes & close.

## Test / Verification Strategy

Runtime (manual / potential automated later):

1. Log in as user with known grants (e.g., `feedback.create`).
2. Attempt policy requiring `feedback.*` (should now FAIL if someone authored such a pattern expecting legacy behavior). This confirms star literal treatment.
3. Attempt exact grant requirement (should PASS when owned, FAIL when missing).
4. AnyGrant vs GrantsAll still operate with literal semantics.

Greps listed above must all pass (0 results where specified).

Edge Cases:

- Grant list empty (no change).
- Grant requirement includes a literal asterisk character (e.g., `data*read`): must only pass if user actually has grant string with star (literal match).
- Mixed policies array: ensure first failing policy index unaffected by logic simplification.

Rollback Plan:

- If unintended regression (missing expected access), reintroduce previous version from git history (only the two changed areas) while investigating.

## Risks & Mitigations

| Risk                                                     | Mitigation                                               |
| -------------------------------------------------------- | -------------------------------------------------------- |
| Hidden dependency on pattern matching in unrevised tasks | Code search + run smoke tests on key routes/API          |
| Over-removal (accidentally deleting unrelated regex use) | Scope grep path to policy access & hook only             |
| Docs drift if future tasks reintroduce patterns          | Add explicit "No pattern support" note (already present) |

## Open Questions

1. Acceptance Criterion with `grep -R "todos.*" src` looked unrelated; replaced with precise regex removal criteria. Confirm change is acceptable.
2. Should we proactively add a guard warning if someone supplies a grant string containing `*` to highlight it's literal? (Currently out of scope—confirm.)
3. Any need to add a unit test now vs deferring fully to `[aeg]`? (Assumed defer—confirm.)

### Answers / Assumptions (Proceeding)

1. Accepted: Replaced criterion with explicit regex/wildcard removal checks (more deterministic).
2. No warning: Goal states silent literal treatment; adding warning would contradict "Zero runtime or dev warnings" goal.
3. Defer tests: Unit tests will be covered under `[aeg]`; this task will rely on greps + manual smoke only.

If any of these need reversal, adjust before execution step.

## Development Plan

Condensed actionable sequence (mirrors Detailed Removal Plan + answers):

1. Server: Edit `src/42go/policy/access/index.ts` – remove `matchesPattern` + star branches. Replace both `grantsAll` and `grantsAny` checks with pure `.includes`. Delete legacy comment.
2. Client: Edit `src/42go/policy/useEvaluatePolicy.ts` – strip regex construction for grants / anyGrant. Simplify to literal `.includes` loops. Ensure no `new RegExp` remains in file after change.
3. Seed Comment: Adjust wildcard explanatory comment in `knex/seeds/20240522_init_auth_data.js` to reflect literal-only semantics (or remove if redundant).
4. Docs: Quick scan `docs/articles/POLICY.md` (already correct). Scan `docs/articles/RBAC.md` if exists; purge wildcard mentions. (If absent, skip.)
5. Cross-task references: Verify `[adt]` does not still promise removal (should already delegate). If present, tweak line to reference this task completion.
6. Grep Verification (post-edit):
   - `grep -R "matchesPattern" src` → none.
   - `grep -R "RegExp" src/42go/policy/useEvaluatePolicy.ts` → none.
   - `grep -R "\\*" src/42go/policy/access/index.ts` → none (except maybe inside unrelated strings; visually confirm).
7. Run `npm run qa` (lint + type + build). Fix any fallout (likely unused imports or formatting).
8. Manual Smoke: Trigger a protected API/page requiring a grant possessed; then one with a pattern (e.g. `feedback.*`) to ensure it fails now (literal mismatch). No warnings emitted.
9. Update this file: Tick completed checkboxes; add Progress section summarizing changes; mark task ready to close.
10. Hand off test coverage to `[aeg]` (note in that task if needed).

Ready to execute (k3) once this plan is acknowledged or immediately if no objections.
