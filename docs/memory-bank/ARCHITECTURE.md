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
├── public/                          # Static assets, app iconsets, and theme CSS
├── src/
│   ├── AppConfig.ts                 # Multi-app configuration
│   ├── proxy.ts                     # Request interception & app resolution
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

### UI Action Button Semantics

Button variants must preserve action meaning across hover and focus states, especially in app themes where `primary` can be green or brand-specific.

- Cancel and dismiss actions use `variant="neutralLink"` or equivalent neutral text-link styling. They must not use primary-colored `outline`, `ghost`, or `link` styles.
- Destructive secondary actions use `variant="destructiveGhost"` or `variant="destructiveOutline"`. They must keep red/destructive hover states and must not borrow primary hover styling.
- Destructive primary confirmations use `variant="destructive"`.
- Neutral icon dismiss controls use `variant="neutralGhost"`.

## Environment

- documentation example in `.env.example`
- validate at startup (still missing)
- provide fallbacks values

## Database Architecture

**Design**: PostgreSQL-first, single database, schema-based isolation
**Configuration**: `DATABASE_URL` (required), `PGPOOL` (optional pool tuning)
**Access**: Singleton `getDB()` from `src/42go/db`, Knex migrations in `./knex/`
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

**RBAC Sources**: Server policy checks are DB-authoritative and query app-scoped assignments in
`auth.roles_users` and `auth.roles_grants` using the current request app ID. Client policy checks are visual only
and read the cached NextAuth JWT session snapshot (`session.user.appId`, `roles`, `grants`). Credentials auth must
resolve the app ID from the actual NextAuth callback request before querying `auth.users`, and JWT RBAC stamping
must use that app ID so roles do not leak across apps.

**Legacy Removal**: Deprecated `featureFlags.pages|apis`, `appRoute`, `appPage`, `pageWithConfig` removed. See ADR [adr-refactor-rbac-policies].

**Usage**: Guard pages with `protectPage(Component, policy)` and API routes with `protectRoute(handler, policy)`; both consume unified policies. Full guide: [docs/FEATURE_FLAGS.md](../articles/FEATURE_FLAGS.md)

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

### Backoffice Route Namespace

Authenticated management surfaces live under `/backoffice/<feature>` with APIs under `/api/backoffice/<feature>`. The namespace communicates operator intent; it never replaces explicit page/API features, session checks, app scoping, roles, or exact grants. Notification management establishes this convention at `/backoffice/notifications`.

User administration follows the same convention at `/backoffice/users`, with management handlers at `/api/backoffice/users`. It remains protected by the `page:users` and `api:users` features, authenticated session, current-app scope, and the `backoffice` role. Exact grants are operation-specific: `users:list` for list/read, `users:edit` for all PATCH updates (including profile and consent resets), and `users:delete` for account erasure.

### App Communication Data

Shared app-to-user communication data lives in the quoted PostgreSQL schema `"42go_data"`, separate from app-owned feature schemas. The root communication row separates channel, immutable authoring kind, presentation style, and priority. Audience membership, per-user final state, and append-only qualified displays are normalized with redundant `app_id` and composite same-app foreign keys. See [NOTIFICATIONS.md](../articles/NOTIFICATIONS.md).

## Theme Management

**Architecture**: `next-themes` with app-specific defaults via AppConfig
**Components**: `ThemeProvider` (SSR-safe), `ThemeToggle` (user control)
**Precedence**: User preference → App default → System preference
**Implementation details**: See [docs/THEMING.md](../docs/THEMING.md)

## Dynamic PWA Install Targets

**Pattern**: AppConfig declares serializable same-origin pathname patterns mapped to named server-only resolvers. A resolver may load authorized database data and override the app PWA identity, launch path, name, icons, and colors for one resource.

**Request flow**: The proxy injects a trusted internal pathname. The 42Go PWA layer resolves one target for the initial document, emits one manifest/Apple metadata set, and serves `/manifest.webmanifest` through an explicit authorization-aware route. The initial manifest remains fixed for that document, so normal App Router navigation stays client-side. Products that need a distinct virtual-app identity use a deliberate full-document installer route where the target manifest is selected server-side. A marked launch URL can establish exact installed-target UI context while leaving the stable manifest ID unchanged.

**Security boundary**: Resolver functions live in `src/PWAInstallTargets.ts` and app-owned server modules, never inside the client-imported AppConfig object. Dynamic manifest requests use credentials, private/no-store caching, same-origin URL validation, and 404 failure for inaccessible resources. Standalone mode and launch markers are UI context only and must never participate in authorization.

**Usage guide**: See [PWA_INSTALL_TARGETS.md](../articles/PWA_INSTALL_TARGETS.md).

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
