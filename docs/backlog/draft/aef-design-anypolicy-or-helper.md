# Design anyPolicy OR Helper [aef]

Introduce OR semantics to the unified policy system without complicating the base `Policy` type. Provide a composable helper `anyPolicy()` that succeeds if ANY of the supplied policies passes, while preserving existing AND semantics for arrays.

## Problem Statement

Current evaluator treats an array of policies as AND (all must pass). There's no ergonomic way to express logical OR ("user has role admin OR grant reports.view"). Developers might hack around by adding new grants or expanding roles, causing role/grant bloat.

## Goals

- Provide clear, explicit OR semantics without breaking existing API.
- Maintain evaluator simplicity; minimal branching overhead.
- Preserve type clarity: authors should see immediately they are writing OR logic.
- Support nested composition (AND of OR groups, etc.) in a predictable way.

## Non-Goals

- NOT introducing full boolean expression parser.
- NOT adding priority/precedence operators.
- NOT changing existing AND semantics.

## Proposed API

```ts
import { anyPolicy, protectRoute } from "@/42go/policy";

const handler = protectRoute(
  GET,
  anyPolicy([
    { require: { role: "admin" } },
    { require: { anyGrant: ["reports.view", "reports.manage"] } },
  ])
);
```

Chaining example (AND + OR):

```ts
protectPage(Page, [
  { require: { feature: "page:dashboard" } }, // AND
  anyPolicy([
    { require: { role: "admin" } },
    { require: { grants: ["dashboard.read"] } },
  ]), // (role admin OR grants all dashboard.read)
]);
```

## Internal Representation

`anyPolicy()` returns an object with a sentinel symbol property, e.g.:

```ts
const OR_SYMBOL = Symbol("policy:any");

interface AnyPolicyWrapper {
  [OR_SYMBOL]: true;
  policies: Policy[];
}
```

Evaluator update pseudocode:

```ts
function expand(p: Policy | AnyPolicyWrapper): Policy | AnyPolicyWrapper { return p; }

for each item in inputPolicies:
  if isAnyPolicy(item):
     evaluate inner policies sequentially; if ANY passes -> continue loop (treat wrapper as pass)
     else -> fail with first failing inner error (or aggregate first error)
  else normal policy evaluation
```

## Error Semantics

- If all inner policies fail, bubble up the FIRST failing inner policy's error (consistent, deterministic).
- Expose `failedIndex` referencing outer array index; optionally add `innerFailedIndex` for debugging (future enhancement, not MVP).

## Type Additions

Extend `EvaluatePoliciesResult` optionally:

```ts
innerFailedIndex?: number; // when OR wrapper fails
```

(Deferred until there's a demonstrated debugging need; keep minimal first.)

## Dev Experience

- Clear naming `anyPolicy` reads naturally.
- No magic strings; symbol ensures no accidental collisions.
- Wrapper object opaque to user; they only call helper.

## Alternatives Considered

1. Policy.require.or: array of PolicyRequire objects. Rejected: bloats base type, invites nested confusing structures.
2. Accept functions returning booleans. Rejected: undermines static analyzability & SSR determinism.
3. Expression DSL (e.g., `or(role('a'), grant('b'))`). Rejected: over-engineered for current needs.

## Edge Cases

- Empty `anyPolicy([])` → Design choice: throw at construction time (developer error). Simpler than implicit fail.
- Single-item `anyPolicy([p])` → Allowed but warn in development (redundant wrapper).
- Nested `anyPolicy` inside another `anyPolicy` → Flatten automatically to avoid double loop.

## Performance Considerations

- Short-circuit on first pass inside OR group.
- Minimal overhead: one extra type check + small loop per OR wrapper.
- No additional DB queries versus naive manual authoring (still only evaluates failing paths until a success).

## Implementation Steps

1. Add `anyPolicy` helper + symbol in `policy/util.ts` (or new `or.ts`).
2. Update server evaluator to detect wrapper.
3. Update client hook similarly (visual pass logic) using session snapshot.
4. Add dev warnings: empty group, single item group.
5. Update docs (`POLICY.md`) with OR examples and composition patterns.
6. Update tests task [aeg] matrix to include OR scenarios.

## Acceptance Criteria

- [ ] `anyPolicy` helper exported in policy index.
- [ ] OR groups short-circuit on first passing inner policy.
- [ ] Failing OR group returns first failing inner policy error.
- [ ] Empty OR group throws at definition time.
- [ ] Single-item OR group logs dev warning (once) but functions.
- [ ] Nested OR groups flatten.
- [ ] Docs updated with examples (AND + OR composition) & guidance.
- [ ] Tests (delegated to [aeg]) include: all fail, first pass, middle pass, last pass, nested flatten, single-item warning.

## Next Steps

plan task (k2)
