# Architecture Documentation

This document defines the core architectural decisions, patterns, and constraints for the 42Go Next project—a multi-tenant Next.js boilerplate supporting dynamic configuration, theming, and RBAC control.

## Tech Stack Decisions

**Language**: TypeScript with Arrow Functions, NodeJS 20+
**Framework**: Next.js 15+ with App Router, React 19+
**UI**: Tailwind CSS, shadcn/ui (Radix UI primitives), next-themes
**Database**: PostgreSQL-only with Knex.js migrations and app driver
**Deployment**: Docker with Next.js standalone output, multi-stage builds with `Dockerfile` for containerization

## Project Structure

```text
├── contents/                        # Markdown docs/content for all apps
├── docs/                            # Implementation guides & documentation
│   ├── memory-bank/                 # Memory bank documentation (architecture, features, dependencies)
│   ├── articles/                    # Project articles
│   └── backlog/                     # Task backlog and archive
├── knex/                            # Database migrations and seeds
├── public/                          # Static assets & theme CSS
├── src/
│   ├── AppConfig.ts                 # Multi-app configuration
│   ├── middleware.ts                # Request interception & app resolution
│   ├── 42go/                        # Boilerplate folder with reusable files & components
│   │   ├── components/              # Boilerplate components & visual utilities
│   │   │   ├── Markdown/            # Main markdown rendering tool (all rendering logic)
│   │   │   ├── docs/                # Support components for DocumentationProject feature
│   │   │   └── pages/               # Support components for DynamicPages feature
│   │   └── lib/                     # Utility functions
│   │       ├── docs/                # Support logic for DocumentationProject feature
│   │       ├── cache/               # File caching utilities
│   │       ├── fs/                  # Filesystem helpers
│   │       └── md/                  # Markdown utilities
│   ├── app/                         # Next.js app router structure
        - docs/*                     # Default routes for DocumentationProjec
│   ├── components/                  # Reusable components (folder-organized)
│   │   └── ui/                      # shadcn/ui components
│   └── lib/                         # Utility libraries
│       ├── db/                      # Postgres utilities
│       ├── auth/                    # Auth utilities
│       └── config/                  # Multi-app utilities
```

## Coding Best Practices

### Arrow Functions

Always favor **arrow functions** `() => {}` instead of the `function () {}` version.

### Export Pattern

Whenever is possible, favor explicit exports:

```ts
// ✅ Favor this pattern:
export const Foo = () => {};
```

instead of defaults:

```ts
// ❌ Avoid this pattern whenever possible:
const Foo = () => {};
export default Foo;
```

### Import Pattern

Aabsolute imports with `@/` alias.

```ts
// ✅ Favor this pattern:
import FooBar from "@/components/FooBar";
```

instead of defaults:

```ts
// ❌ Avoid this pattern whenever possible:
import FooBar from "../../../components/FooBar";
```

### React Component Architecture

**Pattern**: Container/Presentation/Logic separation

**Structure**:

```
ComponentName/
├── index.ts                 # Export interface
├── ComponentName.tsx        # Container
├── ComponentNameUI.tsx      # Presentation
└── useComponentName.ts      # Logic hook
```

**Exports**: Export as `export { ComponentName as default} from './ComponentName';`

**Guidelines**: Use full structure for complex components, simplified for presentational only.

Complex components may have multiple internal Presentation Components or Custom Hooks.

This structure is intended to be recursive: A very complex component can be simplified into a structure of sub-components that follow the same pattern.

## Environment

- documentation example in `.env.example`
- validate at startup (still missing)
- provide fallbacks values

## Database Architecture

**Design**: PostgreSQL-first, single database, schema-based isolation
**Configuration**: `DATABASE_URL` (required), `PGPOOL` (optional pool tuning)
**Access**: Singleton `getDB()` from `src/lib/db`, Knex migrations in `./knex/`
**Usage details**: See [docs/DATABASE.md](../docs/DATABASE.md)

### Bulk Update Optimization Pattern

For bulk position/ordering updates, use PostgreSQL's `unnest()` with `WITH ORDINALITY` for efficient single-statement updates:

```sql
WITH new_pos AS (
  SELECT id, ordinality AS new_order
  FROM unnest($1::uuid[]) WITH ORDINALITY AS u(id, ordinality)
)
UPDATE table_name t
SET position = np.new_order, updated_at = NOW()
FROM new_pos np
WHERE t.id = np.id
  AND t.position IS DISTINCT FROM np.new_order
```

**Benefits**: Single UPDATE vs N UPDATEs, minimal WAL, `IS DISTINCT FROM` skips no-op writes
**Use case**: Drag-and-drop reordering, bulk position updates
**Example**: QuickList task reordering (`/api/quicklists/[projectId]/reorder`)

## Feature Flags (Unified)

See also `docs/articles/POLICY.md` (policy evaluation, prefixes, dev warnings, experimental flags).

**Pattern**: Single `features: string[]` list per app config. Entries prefixed with `page:` or `api:`.

**Inferred Defaults**: `protectPage` / `protectRoute` can infer feature names from URL segments when explicit policy feature not provided.

**Examples**:

```ts
features: ["page:docs", "page:dashboard", "api:todos", "api:feedback"];
```

**URL Inference**: `/docs/intro` → default inferred feature `page:docs`; `/api/todos` → `api:todos`.

**Security Semantics**: Missing feature → 404; missing session → 401; role/grant failure → 403 (via unified policy evaluator).

**Legacy Removal**: Deprecated `featureFlags.pages|apis`, `appRoute`, `appPage`, `pageWithConfig` removed. See ADR [adr-refactor-rbac-policies].

**Usage**: Guard pages with `protectPage(policy)` and API routes with `protectRoute(policy)`; both consume unified policies. Full guide: [docs/FEATURE_FLAGS.md](../articles/FEATURE_FLAGS.md)

## Layouts

**Pattern**: Modular layout system with configuration-driven public layouts

**Public Layout System**:

- **Modular Structure**: `/src/components/layouts/public/` with Header, Footer, and PublicLayout components
- **App-Specific Layouts**: Each AppConfig can define custom `theme.PublicLayout` component
- **Responsive Design**: Mobile-first approach with proper alignment and accessibility
- **SSR-Ready**: Full server-side rendering support for SEO and performance

### App Pages Convention (Client-Only)

For all routes under the `(app)` route group:

- Pages MUST be client components (`"use client"`).
- Wrap content with `AppLayout` to provide navigation chrome and client-side policy enforcement via the `policy` prop.
- Perform data fetching from the browser using `fetch` with `credentials: "same-origin"`.
- Avoid SSR fetch to internal APIs to prevent host/cookie issues.
- Use `useParams`/`useSearchParams` for routing data inside client components.
- Policy semantics (404/401/403) are handled by the unified policy engine through `ProtectComponent` inside `AppLayout`.

Rationale: This avoids SSR pitfalls (e.g., getaddrinfo on inferred hosts, cookie propagation) and unifies UX for loading states.

## Theme Management

**Architecture**: `next-themes` with app-specific defaults via AppConfig
**Components**: `ThemeProvider` (SSR-safe), `ThemeToggle` (user control)
**Precedence**: User preference → App default → System preference
**Implementation details**: See [docs/THEMING.md](../docs/THEMING.md)

## Logging

[[missing details about logging examples and best practices]]

## Monitoring

[[missing details about healthcheck api and maybe OpenTelemetry?]]

## Architectural Constraints

**Multi-Tenancy**: App resolution via request properties, no shared state between apps
**Type Safety**: Full TypeScript across client/server, strict type checking
**Performance**: Static generation preferred, connection pooling, code splitting
**Accessibility**: WCAG AA compliance, keyboard navigation, semantic markup
**Security**: Server-side validation, input sanitization, secure headers

## CLI Integration

This project is mainly a Node app with `npm` or `pnpm` or `yarn` scripts in `package.json`.

A `Makefile` interface is available and strongly encouraged as default mean of executing scripts.

- `make db`: starts and initializes a local Postgres instance using Docker
- `make db.init`: initializes the Postgres instance using `DATABASE_URL` from `.env`
- `make migrate`: applies any new migration
- `make seed`: re-applies the seed script
- `make app`: installs dependencies and start the development server
- `make qa`: apply linting and builds the NextJS solution (useful as last step of a feature development)
- `npx shadcn@latest add <component>` to add a new ShadCN component

---

**Architectural Philosophy**: Favor explicit configuration over convention, server-side validation over client trust, type safety over runtime flexibility.

_Last Updated: August 12th, 2025_
