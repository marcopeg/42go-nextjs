# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

42Go Next Multi is a Next.js 15 boilerplate that enables **multiple independent SaaS applications** to run from a single codebase. Each app has its own configuration, theming, authentication providers, and feature flags, while sharing common infrastructure and components.

**Key Architectural Concept**: Request-based app resolution happens in middleware, setting the AppID which drives all configuration downstream. Apps are defined in `src/AppConfig.ts` and matched via hostname, subdomain, or custom matchers.

## Common Development Commands

```bash
# Database setup (Docker-based local Postgres)
make db                # Start and initialize local Postgres
make db.init           # Initialize existing Postgres with migrations & seeds
make migrate           # Apply new migrations
make seed              # Re-apply seed data

# Development
make app               # Install dependencies and start dev server
make app.start         # Start Next.js dev server only (assumes deps installed)
npm run qa             # Lint and build (run before committing)

# Production
make prod              # Full production pipeline (build + start + init)
make prod.build        # Build Docker image
make prod.start        # Start production environment
make prod.logs         # Follow application logs

# UI Components
npx shadcn@latest add <component>   # Add shadcn/ui component
```

**Important**: The dev server may already be running in the background (managed by `make app.start`). If you need to start it, use `make app.start` - never run `npm dev` directly.

## Tech Stack

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Database**: PostgreSQL with Knex.js (migrations in `./knex/`)
- **Auth**: NextAuth.js with JWT sessions, multiple providers (Credentials, GitHub, Google)
- **UI**: Tailwind CSS 4, shadcn/ui (Radix UI primitives), next-themes
- **Deployment**: Docker with standalone output, multi-stage builds

## Multi-App Architecture

### App Configuration (`src/AppConfig.ts`)

Each app is defined in the `apps` object with:
- **name**: Display name
- **theme**: Default theme (light/dark/system), custom PublicLayout
- **auth**: Enabled providers, logout URL
- **features**: Unified list with `page:` or `api:` prefixes (e.g., `["page:docs", "api:todos"]`)
- **match**: Custom matching logic (hostname, subdomain, or function)
- **public**: Toolbar, footer, PWA config, dynamic pages, docs
- **app**: Default landing page, navigation menu structure

Apps are imported from `src/config/{app-name}/config.ts`.

### Request Flow

1. **Middleware** (`src/middleware.ts`): Resolves AppID via `getAppID()` and sets `x-app-id` header
2. **App Resolution**: Matches request against `AppConfig.match` rules (hostname, subdomain, custom logic)
3. **Configuration Cascade**: Components/pages use `useAppConfig()` to access app-specific settings
4. **Feature Gating**: `protectPage()` / `protectRoute()` enforce feature flags and RBAC policies

### Multi-Tenancy Pattern

- **No shared state**: Each request resolves its app independently
- **Configuration-driven**: All app-specific behavior comes from AppConfig
- **Type-safe**: Full TypeScript inference for app IDs and configs

## Code Organization

```
src/
├── AppConfig.ts              # Multi-app registry and types
├── middleware.ts             # App resolution and header injection
├── 42go/                     # Boilerplate framework (reusable across apps)
│   ├── auth/                 # NextAuth integration and providers
│   ├── components/           # Shared components (Markdown, ContentBlock, docs)
│   ├── layouts/              # PublicLayout and AppLayout systems
│   ├── config/               # App config utilities and hooks
│   ├── db/                   # Database utilities and connection pooling
│   ├── policy/               # RBAC and feature flag evaluation
│   └── utils/                # Filesystem, markdown, caching utilities
├── app/                      # Next.js App Router routes
│   ├── (public)/             # Public routes (landing, login, docs)
│   ├── (app)/                # Protected app routes (client-only)
│   └── api/                  # API routes
├── components/               # App-specific components
│   └── ui/                   # shadcn/ui components
├── config/                   # Per-app configurations
│   ├── default/
│   ├── quicklist/
│   ├── notes/
│   └── calendar/
└── lib/                      # App-specific utilities
```

**42go/ folder**: Contains the boilerplate framework. Treat this as internal framework code - when adding generic functionality that could benefit multiple apps, place it here.

## Coding Standards

### Arrow Functions
```typescript
// ✅ Prefer this
export const MyComponent = () => { /* ... */ };
export const myFunction = (arg: string) => { /* ... */ };

// ❌ Avoid this
export function MyComponent() { /* ... */ }
```

### Import Pattern
```typescript
// ✅ Prefer absolute imports
import { Button } from "@/components/ui/button";
import { getAppConfig } from "@/42go/config/app-config";

// ❌ Avoid relative imports
import { Button } from "../../../components/ui/button";
```

### Export Pattern
```typescript
// ✅ Prefer explicit exports
export const MyComponent = () => { /* ... */ };

// ❌ Avoid default exports unless required by framework
const MyComponent = () => { /* ... */ };
export default MyComponent;
```

### Component Architecture

For complex components, use Container/Presentation/Logic separation:
```
ComponentName/
├── index.ts                   # Export interface
├── ComponentName.tsx          # Container (data fetching, state)
├── ComponentNameUI.tsx        # Presentation (pure rendering)
└── useComponentName.ts        # Logic hook (business logic)
```

For simple presentational components, a single file is fine.

## Feature Flags and RBAC

### Unified Policy System

**Pattern**: Single `features` array in AppConfig controls both availability and access.

```typescript
// In AppConfig
features: ["page:docs", "page:dashboard", "api:todos"]
```

### Server-Side Protection

```typescript
// Pages (Server Components)
import { protectPage } from "@/42go/policy/server";

export default async function DocsPage() {
  await protectPage({
    feature: "page:docs",  // Optional: inferred from URL if omitted
    auth: true,            // Require authentication
    roles: ["admin"],      // Optional: require roles
  });
  // ...
}

// API Routes
import { protectRoute } from "@/42go/policy/server";

export const GET = protectRoute(
  { feature: "api:todos", auth: true },
  async (req, policy) => {
    // Access policy.user, policy.session
  }
);
```

### Client-Side Protection

```typescript
// App Pages (Client Components)
"use client";
import { AppLayout } from "@/42go/layouts/app";

export default function DashboardPage() {
  return (
    <AppLayout policy={{ feature: "page:dashboard", auth: true }}>
      {/* Content */}
    </AppLayout>
  );
}
```

### Feature Inference

If `feature` is omitted, it's inferred from the URL:
- `/docs/intro` → `page:docs`
- `/api/todos` → `api:todos`

### Response Codes

- Missing feature → **404**
- Missing auth → **401**
- Failed role/grant check → **403**

## App Pages Convention (Routes under `(app)`)

**Critical Pattern**: All authenticated app pages must follow this convention:

1. **Client-only**: Add `"use client"` directive at top
2. **AppLayout wrapper**: Wraps content for navigation and policy enforcement
3. **Browser-side data fetching**: Use `fetch` with `credentials: "same-origin"`
4. **No SSR fetching**: Avoid calling internal APIs during server render

```typescript
"use client";
import { AppLayout } from "@/42go/layouts/app";
import { useEffect, useState } from "react";

export default function MyAppPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/my-data", { credentials: "same-origin" })
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <AppLayout policy={{ feature: "page:my-app", auth: true }}>
      {data ? <MyContent data={data} /> : <Loading />}
    </AppLayout>
  );
}
```

**Rationale**: Prevents SSR issues with host resolution, cookie propagation, and provides consistent loading UX.

## Database Patterns

### Connection

```typescript
import { getDB } from "@/42go/db";

const db = await getDB();
const users = await db("auth.users").select("*");
```

**Important**: Always use `getDB()` singleton - never create new connections. Connection pooling is managed via `PGPOOL` environment variable.

### Migrations

```bash
make migrate              # Apply latest migrations
make migrate.status       # Check migration status
make migrate.redo         # Rollback and reapply last migration
make migrate.rebuild      # Rollback all and reapply
```

Migrations are in `./knex/migrations/` and follow Knex.js conventions.

### Bulk Update Pattern

For drag-and-drop reordering or bulk position updates, use PostgreSQL's `unnest()` with `WITH ORDINALITY`:

```typescript
await db.raw(`
  WITH new_pos AS (
    SELECT id, ordinality AS new_order
    FROM unnest(?::uuid[]) WITH ORDINALITY AS u(id, ordinality)
  )
  UPDATE tasks t
  SET position = np.new_order, updated_at = NOW()
  FROM new_pos np
  WHERE t.id = np.id
    AND t.position IS DISTINCT FROM np.new_order
`, [taskIds]);
```

**Benefits**: Single UPDATE vs N UPDATEs, skips no-op writes.

## Authentication

### NextAuth Configuration

Auth is configured per-app in `AppConfig.auth.providers`. Available providers:
- **credentials**: Username/password with bcrypt (seed users: john/john, jane/jane)
- **github**: GitHub OAuth with minimal scopes
- **google**: Google OAuth / OpenID Connect

### Multi-App OAuth

Different apps can use different OAuth clients:
```
APP1_GITHUB_CLIENT_ID=xxx
APP1_GITHUB_CLIENT_SECRET=xxx
APP2_GOOGLE_CLIENT_ID=xxx
APP2_GOOGLE_CLIENT_SECRET=xxx
```

Provider selection happens at runtime based on AppConfig.

### Session Access

```typescript
// Server Component or API Route
import { getServerSession } from "next-auth";
import { authOptions } from "@/42go/auth/lib/authOptions";

const session = await getServerSession(authOptions);
if (!session) {
  // Handle unauthenticated
}
```

### Account Linking

Users are matched by email across all providers. OAuth accounts link to existing users automatically.

## Theme System

### App-Level Defaults

```typescript
// In AppConfig
theme: {
  default: "dark",  // "light" | "dark" | "system"
}
```

**Precedence**: User preference → App default → System preference

### Theme Toggle

```typescript
import { ThemeToggle } from "@/42go/config/ThemeToggle";

<ThemeToggle />  // Renders theme switcher button
```

### Custom Public Layout

```typescript
// In AppConfig
theme: {
  PublicLayout: MyCustomLayout,
}
```

## Documentation System

### Content Location

App-specific docs go in `contents/{app-id}/docs/`. The default app uses `contents/default/docs/`.

### Doc Configuration

```typescript
// In AppConfig
public: {
  docs: {
    source: "contents/myapp/docs",  // Custom path
    cache: {
      duration: 300000,  // 5 minutes (ms)
    },
  },
}
```

### Doc Routes

Docs are automatically served at `/docs` via catch-all route. Use markdown with frontmatter for metadata.

## Testing and Quality Assurance

```bash
npm run qa          # Lint and build (required before commits)
npm run lint        # ESLint only
npm run build       # Next.js build only
```

**Before committing**: Always run `npm run qa` to catch linting and build errors.

## Key Documentation Files

### Memory Bank (Essential Context)

**When starting new tasks**: Read the memory bank files to understand current architecture and decisions:

- `docs/memory-bank/ARCHITECTURE.md`: Architectural decisions and patterns
- `docs/memory-bank/FEATURES.md`: Feature descriptions and integration
- `docs/memory-bank/DEPENDENCIES.md`: Library usage and integration notes

**When completing tasks**: Update memory bank files if you've made architectural decisions or added significant features.

### Detailed Articles

- `docs/articles/`: Detailed guides on specific topics:
  - `APP_CONFIG.md`: AppConfig structure and options
  - `FEATURE_FLAGS.md`: Feature flag and RBAC usage
  - `RBAC.md`: Role-based access control patterns
  - `POLICY.md`: Policy evaluation and security semantics
  - `THEMING.md`: Theme system implementation
  - `DATABASE.md`: Database patterns and connection pooling
  - `GITHUB_OAUTH_SETUP.md`: GitHub OAuth configuration
  - `GOOGLE_OAUTH_SETUP.md`: Google OAuth configuration
  - `PRODUCTION_DEPLOYMENT.md`: Docker deployment guide

## Important Gotchas

1. **Dev server may already be running** - check before starting with `make app.start`
2. **App pages must be client components** - add `"use client"` and use `AppLayout`
3. **Use absolute imports** - always import with `@/` prefix
4. **Feature flags use prefixes** - `page:` for pages, `api:` for APIs
5. **Database is PostgreSQL-only** - no MySQL/SQLite support
6. **shadcn components install from root** - not from subdirectories
7. **Middleware logs on every request** - `@@@@@ MIDDLEWARE :: START` is expected
8. **AppConfig changes require restart** - not hot-reloaded by default
9. **Run `npm run qa` after code changes** - catch linting and build errors before committing

## Environment Variables

Key variables to set in `.env`:

```bash
# Database (required)
DATABASE_URL=postgres://user:pass@localhost:5432/dbname

# NextAuth (required for auth)
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# OAuth (per-app, optional)
APP1_GITHUB_CLIENT_ID=xxx
APP1_GITHUB_CLIENT_SECRET=xxx
DEFAULT_GOOGLE_CLIENT_ID=xxx
DEFAULT_GOOGLE_CLIENT_SECRET=xxx

# Optional
PGPOOL='{"min":2,"max":10}'  # Connection pool tuning
```

See `.env.example` for full reference.

## Security Considerations

- **Input validation**: Always validate on the server-side, never trust client input
- **Feature flags**: Missing feature returns 404 (prevents enumeration)
- **SQL injection**: Use Knex parameterized queries, never string concatenation
- **XSS protection**: Markdown rendering uses `rehype-sanitize` and `sanitize-html`
- **Session security**: HTTP-only cookies, automatic rotation, 30-minute refresh
- **OAuth tokens**: Stored server-side in database, never exposed to client

## Workflow for Adding a New App

1. Create config file: `src/config/myapp/config.ts`
2. Import in `src/AppConfig.ts` and add to `apps` object
3. Define matching logic (hostname, subdomain, or custom)
4. Set up features, auth providers, and theme
5. Create app-specific routes in `src/app/`
6. (Optional) Add content in `contents/myapp/`
7. Test with appropriate hostname or matcher

## Additional Notes

- **Makefile is preferred**: Use `make` commands for common operations
- **Memory bank updates**: When making architectural changes, update `docs/memory-bank/`
- **Backlog system**: The project uses a custom backlog system in `docs/backlog/`
- **Copilot instructions**: The `.github/copilot-instructions.md` contains detailed workflow commands (k0-k9) for task management - these are specific to the team's workflow with other AI assistants

---

**Philosophy**: Configuration over convention, server-side validation over client trust, type safety over runtime flexibility.
