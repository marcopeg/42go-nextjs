---
taskId: AEL
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# Stack Block Component [ael]

Implement a new `stack` BlockComponent that lays out multiple BlockComponents in a stack, similar to MUI's Stack.
The Stack should support:

- Both horizontal (`row`) and vertical (`column`) direction via a `direction` prop (default "row").
- Configurable spacing between items via a `spacing` prop.
- An `items` prop which is an array of BlockComponents configr to render inside each of the stack's cells
- Nesting of Stack components inside one another.

## Goals

- [x] Add a new `StackBlock` component under `src/42go/components/ContentBlock/blocks` with type `stack`.
- [x] Define props (with responsive support) per refined spec.
- [x] Register `stack` in `ContentBlock/server.tsx` blocksMap and ContentBlockItem union type.
- [x] Implement rendering logic with Tailwind flex direction + gap + alignment + responsive.
- [x] Support nested stacks via injected renderer recursion.

## Acceptance Criteria

- [ ] DynamicPage correctly renders `stack` blocks.
- [x] Direction prop applies `flex-row` or `flex-col` classes (and responsive variants).
- [x] Spacing prop applies `gap-{size}` classes between items (and responsive variants).
- [x] Items prop renders provided BlockComponents in order.
- [x] Nested `stack` blocks work without errors.

## Example

```ts
// Configuration to a ComponentBlock
const items = [
  {
    type: "mardown",
    source: "some content",
  },
  {
    type: "stack",
    direction: "row",
    spacing: 10,
    items: [
      // First item in the stack
      [
        {
          type: "markdown",
          source: "another content",
        },
      ],

      // Second item in the stack
      [
        {
          type: "cta",
          action: { href: "/login", label: "login" },
        },
        // Nested stack
        {
          type: "stack",
          items: [
            [
              {
                type: "markdown",
                source: "another content",
              },
            ],
            [
              {
                type: "markdown",
                source: "another content",
              },
            ],
          ],
        },
      ],
    ],
  },
];
```

## Specification (Refined)

### Purpose

Provide a composable layout BlockComponent that stacks child BlockComponents either horizontally or vertically with consistent spacing tokens, supporting nesting without special-case logic.

### Proposed Type

```ts
// Responsive helper types (simple optional breakpoint map). If a plain string is provided it overrides all breakpoints.
type ResponsiveValue<T extends string> =
  | T
  | {
      base?: T; // mobile-first
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
    };

export interface TStackBlock {
  type: "stack";
  direction?: ResponsiveValue<"row" | "column">; // default: 'row'
  spacing?: ResponsiveValue<"none" | "sm" | "md" | "lg" | "xl">; // tokens → tailwind gap classes
  wrap?: boolean; // allow wrapping when row (default false)
  align?: "start" | "center" | "end" | "stretch"; // cross-axis alignment
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"; // main-axis distribution
  items: ContentBlockItem[]; // children blocks rendered in order
}
```

Add `TStackBlock` to `ContentBlockItem` union in `server.tsx` (and any client variant if present).

### Tailwind Mapping

| Prop      | Value   | Class           |
| --------- | ------- | --------------- |
| direction | row     | flex-row        |
| direction | column  | flex-col        |
| spacing   | none    | gap-0           |
| spacing   | sm      | gap-2           |
| spacing   | md      | gap-4           |
| spacing   | lg      | gap-6           |
| spacing   | xl      | gap-8           |
| wrap      | true    | flex-wrap       |
| align     | start   | items-start     |
| align     | center  | items-center    |
| align     | end     | items-end       |
| align     | stretch | items-stretch   |
| justify   | start   | justify-start   |
| justify   | center  | justify-center  |
| justify   | end     | justify-end     |
| justify   | between | justify-between |
| justify   | around  | justify-around  |
| justify   | evenly  | justify-evenly  |

Responsive handling: when `direction` or `spacing` is an object we emit breakpoint-prefixed utility classes (e.g., `md:flex-col`). Plain string short-circuits and applies globally.

### Rendering Contract

- Server component (no client state required) returning a `<div role="group">` wrapper with composed className: `flex` + direction classes + gap classes + wrap? + align + justify.
- Children rendered by invoking existing renderer on `items`.
- No extra DOM around each child (avoid layout clutter) unless needed for future features; keep minimal.
- Responsive: expand object props into utility classes: for each breakpoint key `bp` generate `{bp}:flex-row|flex-col` and `{bp}:gap-*`. Order: base → sm → md → lg → xl.

### Edge Cases

1. Empty `items` array → render `null` (explicit decision).
2. Invalid spacing token (should be typed; runtime fallback to `gap-0`).
3. Nested stacks deep (ensure recursion is O(n) and no stack overflow—fine for typical content sizes).
4. Mixed server/client block children (should already be handled by existing ContentBlock renderer).
5. Large number of children (performance: map pass only; no layout thrash expected).

### Performance Considerations

- Pure presentational logic; no async operations.
- Memoization not required; rely on React's default reconciliation.

### Accessibility

- No inherent semantics beyond grouping; wrapper remains `<div role="group">` could be optional future enhancement. (Not adding now—non-goal.)

### Testing Strategy (Minimal)

- Unit test (if infra exists) verifying className composition given various prop combinations.
- Snapshot / render test with nested stack.
- Negative test: empty items returns null/empty output.

### Documentation Updates

- Update any ContentBlock docs list of available block types.
- Provide usage example in DynamicPage documentation (brief snippet).

### Non-Goals (Explicit)

- Grid / 2D layout semantics (this is linear flex only).
- Arbitrary numeric spacing (token-based only for consistency).

## Decisions

1. Spacing tokens: keep original (`none|sm|md|lg|xl`). Dropped experimental `xs`.
2. Responsive support: YES for `direction` & `spacing` via breakpoint object. Plain string overrides all breakpoints.
3. Empty stack renders `null`.
4. No per-item flex overrides (can be future enhancement).
5. Accessibility: always render wrapper with `role="group"`.

## Risks

- Scope creep toward full layout system; keep strictly to linear flex.
- Overloading with responsive features prematurely.

## Implementation Steps (Draft)

1. Create `StackBlock.tsx` under `blocks/` exporting `TStackBlock` + component.
2. Add type to union & block mapping in `server.tsx` (and any client variant if needed).
3. Implement className builder helper (handles responsive expansion & token mapping).
4. Render null when `items.length === 0`.
5. Add `role="group"` to wrapper.
6. Update docs (ContentBlock list) & example configuration.
7. (Optional) Add test file for className generation & nested rendering.

## Next Steps

Add a sample usage into docs & DynamicPage config to validate real render; then mark remaining acceptance criterion.

---

Refinement complete awaiting answers to Open Questions. Provide clarifications to lock API before implementation.
