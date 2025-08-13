# Unified Policy Engine Tests Implementation [aeg]

Implement comprehensive automated tests for unified policy engine (server + client utilities) guided by strategy in [aea]. Cover evaluator correctness, guards integration, wildcard semantics, multi-policy AND chains, and future OR design hooks (placeholder for [aef]) without blocking current refactor.

## Scope

Test layers:

1. Pure server evaluation (`evaluatePolicy`).
2. Access DB layer (`checkAccess`, role + grant resolution) with seeded data.
3. API route guard (`protectRoute`) integration responses.
4. Page guard (`protectPage`) redirect behavior (via route handler / mock?).
5. Client hook (`useEvaluatePolicy`) behavior (React Testing Library + session mocking).
6. Dev warnings (feature prefix, strict unused, anyPolicy single item) – when NODE_ENV=development.

## Goals

- Detect regressions in core semantics: feature → 404, session → 401, role/grant → 403.
- Validate multi-policy failure ordering (`failedIndex`).
- Validate wildcard grant patterns (positive + negative cases).
- Ensure `onFail` overrides produce expected status/message JSON for API route guard.
- Ensure `protectPage` bugfix (no fall-through) holds: each failure path produces correct redirect/404.
- Baseline performance: evaluator completes within ~ few ms for small policy arrays (sanity, not perf bench).
- Provide ergonomic test helpers to author future policy tests quickly.

## Out of Scope

- OR helper runtime tests (implemented later in [aef]); only placeholders / pending tests listed.
- Strict mode behavioral differences (not implemented yet).

## Test Data Strategy

Use existing seed or create local fixtures:

- Seed ensures users with: roles (admin, user), grants mapped to roles, wildcard patterns (e.g., role with grants `todos.read`, `todos.write`).
- Add one role with multi grants for ALL & ANY tests.
- If missing, extend seed inside conditional test-specific migration (or create ephemeral tables?) – prefer reusing current migrations + seed.

## Helper Utilities

Create `test/policy/helpers.ts`:

- `makePolicy(p: Partial<PolicyRequire>): Policy` quick builder.
- `execEvaluate(p: Policy|Policy[], ctxOverrides?): Promise<Result>`.
- `mockSession(userOverrides)` returns a mocked NextAuth session for client hook tests.
- `renderWithSession(ui, session)` for hook/component tests.

## Test Matrix

### Server evaluatePolicy

| Case                    | Description                         | Expected                                 |
| ----------------------- | ----------------------------------- | ---------------------------------------- |
| feature missing         | feature not in config               | pass=false, code=feature, status map=404 |
| feature bad prefix      | `feature:"docs"`                    | code=feature detail prefix error         |
| session required none   | require.session true w/out session  | code=session                             |
| role missing            | require.role admin                  | code=role                                |
| role present            | existing role                       | pass=true                                |
| grants ALL fail         | all not satisfied                   | code=grant                               |
| grants ALL pass         | all satisfied                       | pass=true                                |
| anyGrant fail           | none satisfied                      | code=grant                               |
| anyGrant pass           | at least one                        | pass=true                                |
| wildcard single pass    | pattern todos.\* matches todos.read | pass=true                                |
| wildcard single fail    | pattern reports.\* no match         | code=grant                               |
| AND first fails         | [A(fail),B(pass)]                   | failedIndex=0                            |
| AND second fails        | [A(pass),B(fail)]                   | failedIndex=1                            |
| onFail override status  | policy with onFail {status:418}     | Response 418 in route guard              |
| onFail override message | custom message set                  | JSON message matches                     |

### API protectRoute Integration

| Case                      | Path                            | Setup                  | Expected |
| ------------------------- | ------------------------------- | ---------------------- | -------- |
| Inferred feature success  | /api/todos w/ feature enabled   | 200 handler body       |
| Inferred feature disabled | feature removed                 | 404 JSON error feature |
| Auth required 401         | require.session true no session | 401 JSON error session |
| Role required 403         | require.role admin w/out role   | 403 JSON error role    |
| Grants ANY 403            | fail anyGrant                   | 403 JSON error grant   |
| onFail override           | onFail{status:429}              | 429 JSON error         |

### Page protectPage Integration

| Case                 | Path                   | Expected               |
| -------------------- | ---------------------- | ---------------------- |
| Inferred feature 404 | missing feature        | notFound thrown        |
| Session redirect     | require.session true   | redirect /login        |
| Role redirect        | require.role missing   | redirect /unauthorized |
| Grant redirect       | require.grants missing | redirect /unauthorized |
| Success              | feature present        | page renders           |

### Client useEvaluatePolicy

| Case                     | Description                        | Expected                    |
| ------------------------ | ---------------------------------- | --------------------------- |
| Loading state            | session status loading             | loading=true                |
| Feature invalid prefix   | feature:"x"                        | error.feature detail prefix |
| Feature disabled         | feature not enabled                | error.feature               |
| Session missing          | require.session true               | error.session               |
| Role missing             | role not in session roles          | error.role                  |
| Grants all missing       | missing grant                      | error.grant                 |
| Grants any missing       | none match                         | error.grant                 |
| Wildcard match           | grants:["todos.*"] with todos.read | pass=true                   |
| Multi-policy first fail  | [A(fail),B(pass)]                  | failedIndex=0               |
| Multi-policy second fail | [A(pass),B(fail)]                  | failedIndex=1               |
| Pass                     | all pass                           | pass=true                   |

### Dev Warnings (optional snapshot)

- Invalid feature prefix triggers warning once.
- Single-item anyPolicy (after [aef]) triggers warning once.
- strict usage logs experimental note.

## Tooling

Testing stack TBD (Jest / Vitest). Strategy: Pick one consistent runner (prefer Vitest for speed + ESM). Ensure alignment with existing project scripts; if runner absent create task to integrate (else reuse configured one).

## Risks

- Need stable seed data; altering production seed for tests may introduce coupling. Mitigate with isolated test-only seed extension or factory pattern.
- Next.js App Router + route handlers tricky to test; consider invoking wrapped handler directly with mocked Request objects.

## Acceptance Criteria

- [ ] Helpers file created.
- [ ] Server evaluator tests implemented per matrix.
- [ ] Access layer wildcard tests implemented.
- [ ] protectRoute tests (core cases) implemented.
- [ ] protectPage tests (at least failure mapping + success) implemented.
- [ ] Client hook tests (core cases) implemented w/ session mock.
- [ ] Dev warnings asserted (if feasible) or smoke-captured.
- [ ] Docs updated (POLICY.md) referencing test scope.
- [ ] All tests green in CI (`npm run qa` includes test step or separate script added).

## Dependencies

- Refactor from [adt] merged.
- Design from [aef] (only partial for warnings/tests referencing anyPolicy later).

## Next Steps

plan task (k2)
