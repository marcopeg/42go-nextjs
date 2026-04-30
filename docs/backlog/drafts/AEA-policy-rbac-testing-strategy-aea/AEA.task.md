---
taskId: AEA
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Policy & RBAC Testing Strategy [aea]

Define and implement a coherent testing approach for the unified Policy / RBAC refactor (server + client) now that initial implementation shipped without tests.

## Context

Core policy engine (server + client) is implemented (adt, adw, adx, adz). Testing was intentionally deferred to accelerate migration. We now need focused coverage to lock behavior before further refactors (adu, ady) and feature expansion.

## Scope

Covers unit, integration-lite (API route), and lightweight component behavior assertions. Excludes full e2e browser automation (future story if needed).

## Goals

- [ ] Document test matrix (areas, purpose, priority)
- [ ] Add unit tests: server evaluatePolicy() precedence + error codes
- [ ] Add unit tests: protectRoute() status mapping (401/403/404) & feature inference
- [ ] Add unit tests: protectPage() default feature inference & multi-policy short-circuit
- [ ] Add unit tests: useEvaluatePolicy() first-failure ordering & role vs grant distinction
- [ ] Add unit tests: AppLayout policy prop wraps children and passes through without policy
- [ ] Add regression test for legacy rbacRoute() accepting unified Policy
- [ ] Establish test utilities / fixtures (mock session, mock appConfig, fake grants)
- [ ] CI-ready npm script (e.g. `npm run test:policy`) placeholder even if tooling minimal

## Acceptance Criteria

- Deterministic tests covering all error code branches (session, feature, role, grant)
- Clear separation: server evaluator tests do not import client-only code
- No reliance on real database/network (mock RBAC access + feature sets)
- Fast: full suite < 2s locally (target; skip heavy integration)
- ADR updated with a brief "Testing" section referencing this story

## Out of Scope

- Full playwright/cypress e2e
- Performance benchmarks
- Complex DB seeding (mock instead)

## Proposed Test Matrix

| Area                       | File(s)                              | Cases                                                                                                               |
| -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Server evaluatePolicy      | src/42go/policy/server.ts            | pass all, fail feature, fail session, fail role, fail grants(anyGrant), invalid prefix                              |
| API guard                  | src/42go/policy/protectRoute.ts      | feature→404, session→401, role/grant→403, multi-policy first failure                                                |
| SSR guard                  | src/42go/policy/protectPage.tsx      | default feature inference, explicit policies array short-circuit                                                    |
| Client hook                | src/42go/policy/useEvaluatePolicy.ts | feature set build, role vs grant error code, anyGrant vs grants strategy, dbOnly branch (mock), first failure index |
| Layout integration         | src/42go/layouts/app/AppLayout.tsx   | renders children unguarded, hides children when failing policy, uses custom renderOnError                           |
| Legacy wrapper back-compat | src/42go/rbac/utils/rbacRoute.ts     | policy array mapping, error-to-status mapping                                                                       |

## Implementation Notes

- Introduce a minimal test runner (likely Jest or Vitest). If new dependency chosen, document in DEPENDENCIES.md.
- Provide lightweight mocks for: getServerSession, getAppConfig, checkServerAccess.
- Avoid hitting NextAuth internals heavily—mock return shapes.
- For client hook tests, use React Testing Library + act() to resolve async effect.

## Risks

- Adding test tooling increases bundle of dev deps—keep minimal.
- Over-mocking may hide regressions; prefer narrow, behavior-first tests.

## Next Steps

1. Choose runner (Vitest recommended for speed + TS). Add config.
2. Scaffold test utils (mocks for session/appConfig/rbacAccess).
3. Implement server evaluator tests.
4. Implement protectRoute / protectPage tests.
5. Implement client hook + AppLayout tests.
6. Add legacy rbacRoute test.
7. Wire script + update ADR testing section.

## Linkages

- Blocks closure of test-related acceptance in: adt, adw, adx, adz.
- Precedes cleanup tasks in ady (removal safer once covered).

## Next Steps

Execute task (k2)

## Progress

Planning only. Test matrix defined; no tooling or test files yet. Runner not chosen (Vitest recommended). Awaiting execution kickoff.

## Status

Not Started.
