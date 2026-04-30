# Dependencies

This file captures macro dependencies and the proven update playbook from the PE62 -> XI41 sequence.

## Update Guidelines

Use this process when running a full dependency maintenance cycle.

### 1. Work in explicit phases

1. Patch updates first.
2. Minor updates second, grouped by domain.
3. Major updates next, split by risk type.
4. Exact pinning last.

Rationale: this isolates blast radius and keeps rollback cheap.

### 2. Assess risk before touching versions

Classify each candidate dependency:

- Framework/security critical: Next.js, React runtime, auth runtime.
- Toolchain strictness: TypeScript, ESLint, eslint-config-next.
- Data-path critical: knex, pg, pg-query-stream.
- UI surface: Radix/shadcn, lucide-react, Tailwind stack.
- Utility/low blast radius: date-fns, clsx, cva, gray-matter, sanitize-html.

Use this confidence model:

- Patch or conservative minor updates: medium-high confidence after qa plus smoke tests.
- Major tooling updates: medium confidence until lint and type strictness issues are fixed.
- Major framework updates: medium confidence until runtime/browser checks pass.
- Final pinning: high confidence only after cold reinstall validation.

### 3. Split into independent tasks

Use small, narrow tasks with one concern each.

Recommended split pattern:

1. Lockfile hygiene and dead dependency cleanup.
2. Patch-only refreshes.
3. Minor utilities.
4. Minor React and styling stack.
5. Framework security bumps.
6. Higher-risk major upgrades (TypeScript, then ESLint).
7. Final pin-all pass.

Rule: if a task needs both broad dependency changes and source refactors, split it.

### 4. Validation gates for every step

Required for each dependency task:

1. Run install and ensure no invalid tree state.
2. Run qa gate (`eslint` plus production build).
3. Run app/API smoke checks on key auth and core routes.
4. Record warning deltas as baseline vs regression.

Required for final pinning and risky majors:

1. Delete `node_modules`.
2. Delete lockfile.
3. Clear caches.
4. Reinstall from `package.json` only.
5. Run qa again.

This catches warm-lockfile illusions.

### 5. Confidence and stop rules

Stop and park when upstream ecosystem compatibility is not ready.

Example already seen here: ESLint 10 is parked because Next plugin chain compatibility is incomplete. Avoid forcing local long-lived shims unless explicitly chosen as policy.

### 6. Repository-proven gotchas

- Cold install revealed a hidden dnd-kit peer mismatch that warm installs masked.
- Next security bump required CSP adjustments in development.
- TypeScript 6 required explicit `types` declaration in tsconfig.
- Type package pins and overrides must stay aligned to avoid resolver drift.

## Macro Dependencies

### Framework Core

- `next`
- `react`
- `react-dom`

Why it matters: routing, server rendering, build pipeline, and runtime behavior all flow through this layer.

### Toolchain and Quality Gates

- `typescript`
- `eslint`
- `eslint-config-next`

Why it matters: defines strictness and compatibility boundaries. Most upgrade friction appears here first.

### Database and Data Access

- `knex`
- `pg`
- `pg-query-stream`

Why it matters: these power authentication and application data paths; query typing and runtime driver behavior can break silently if unverified.

### Authentication

- `next-auth`
- `bcrypt`

Why it matters: login/session stability and provider behavior are business critical. Keep updates conservative and validated.

### UI Primitives and Design System Base

- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-slot`
- shadcn/ui generated components

Why it matters: these are the shared interaction primitives used across app surfaces.

### Styling and Theming Stack

- `tailwindcss`
- `@tailwindcss/postcss`
- `tw-animate-css`
- `tailwind-merge`
- `next-themes`

Why it matters: controls build-time CSS generation and runtime theme behavior.

### Client Data and Validation

- `@tanstack/react-query`
- `zod`

Why it matters: determines client-side fetch/cache behavior and server payload validation discipline.

### Content and Markdown Rendering

- `react-markdown`
- `react-syntax-highlighter`
- `remark-gfm`
- `rehype-sanitize`
- `sanitize-html`
- `gray-matter`

Why it matters: docs/content rendering and sanitization are both functionality and security concerns.

### Interaction Utilities

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
- `lucide-react`
- `date-fns`
- `uuid`
- `clsx`
- `class-variance-authority`

Why it matters: powers drag-drop flows, iconography, date and id handling, and UI class composition.

## Constraints To Preserve

- PostgreSQL-only runtime support.
- JWT-first NextAuth session model.
- Absolute import conventions and repository lint policy.
- Dependency updates must stay observable through task-level notes and qa proofs.
