# Features

## Core Platform Capabilities

### Dynamic Multi-App Configuration

**Capability**: Request-based app resolution enabling multiple SaaS applications from single codebase
**Implementation**: `src/AppConfig.ts` with middleware-driven app matching
**Benefits**: Dynamic configuration per request, no performance overhead, server-side validation
**Architecture details**: See [ARCHITECTURE.md](./ARCHITECTURE.md#multi-app-configuration-system)
**Usage guide**: See [docs/APP_CONFIG.md](../docs/APP_CONFIG.md)

### Enterprise Theme System

**Capability**: App-specific default themes with user preference override
**Implementation**: `next-themes` with AppConfig integration via `ThemeProvider`
**Features**: Light/dark/system themes, SSR-safe, localStorage persistence, zero-flash transitions
**Theme precedence**: User preference → App default → System preference
**Comprehensive guide**: See [docs/THEMING.md](../docs/THEMING.md)

### PostgreSQL Database Integration

**Capability**: Production-ready database layer with connection pooling
**Implementation**: Knex.js with PostgreSQL-only focus, singleton pattern
**Configuration**: `PGSTRING` (required), `PGPOOL` (optional pool tuning)  
**Features**: Migration system, TypeScript support, Next.js optimization
**Usage guide**: See [docs/DATABASE.md](../docs/DATABASE.md)

## Authentication & Security

### JWT-Based Authentication

**Capability**: NextAuth.js with JWT sessions and automatic refresh
**Implementation**: HTTP-only cookies, 30-minute refresh, 30-day max duration
**Features**: Automatic session management, graceful expiration, extensible for social login
**Security**: XSS protection, token rotation, session validation hooks

### Database-Backed Authentication

**Capability**: Production authentication with PostgreSQL user storage
**Implementation**: NextAuth.js credentials provider with bcrypt hashing
**Features**: Case-insensitive login, user enumeration protection, optimized queries
**Database**: `auth.users` table with bcrypt passwords, existing seed data (john/john, jane/jane)

### Feature Flag System

**Capability**: Granular page and API route control per app
**Implementation**: App-specific `featureFlags.pages` and `featureFlags.apis` arrays
**Features**: Wildcard (`*`) support, server-side validation, middleware enforcement
**Usage guide**: See [docs/FEATURE_FLAGS.md](../docs/FEATURE_FLAGS.md)

## UI & Development

### Component Architecture

**Capability**: Container/Presentation/Logic separation with shadcn/ui integration
**Implementation**: Folder-organized components with TypeScript support
**Features**: Accessible Radix UI primitives, theme integration, component CLI
**Standards**: Arrow functions, absolute imports, strict TypeScript

### Development Tooling

**Capability**: ESLint, build optimization, database migrations
**Implementation**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
**CLI**: `npm run lint && npm run build`, `npm run migrate`, `npx shadcn@latest add`
**Never**: `npm dev` (use `make app.start`)

---

**Feature Integration**: All features work together through the AppConfig system, enabling different feature sets per application while maintaining shared infrastructure.

_For detailed implementation guides, see the `docs/` directory._
