# Architecture Documentation

This document defines the core architectural decisions, patterns, and constraints for the 42Go Next project - a multi-tenant NextJS boilerplate supporting dynamic configuration, theming, and RBAC control.

## Core Architectural Patterns

### 1. Multi-App Configuration System

**Pattern**: Request-based app resolution with server/client configuration bridge

**Key Components**:

- `src/AppConfig.ts` - App configurations and matching logic
- `src/middleware.ts` - Request interception and app resolution via `X-App-Name` header
- Server components read header, client uses script tag + React Context

**Benefits**: Avoids config serialization, enables dynamic multi-tenant apps, server-side validation

### 2. Feature Flag Architecture

**Pattern**: App-specific page and API route control via configuration whitelists

**Implementation**:

- `featureFlags.pages` and `featureFlags.apis` arrays per app
- Supports wildcard (`*`) or specific route lists
- Server-side validation in middleware

### 3. Component Architecture

**Pattern**: Container/Presentation/Logic separation

**Structure**:

```
ComponentName/
├── index.ts                 # Export
├── ComponentName.tsx        # Container
├── ComponentNameUI.tsx      # Presentation
└── useComponentName.ts      # Logic hook
```

**Guidelines**: Use full structure for complex components, simplified for presentational only.

Complex components may have multiple internal Presentation Components or Custom Hooks.

This structure is intended to be recursive: A very complex component can be simplified into a structure of sub-components that follow the same pattern.

### 4. Authentication Architecture

**Pattern**: JWT-first with OAuth integration and database persistence

**Core Strategy**:

- **Session Management**: JWT tokens for stateless authentication (30-day max, 30-minute refresh)
- **Multi-Provider Support**: Credentials (username/password) + OAuth (GitHub, Google) with extensible architecture
- **Account Linking**: Email-based user matching across all authentication providers
- **Database Design**: Separation of user profiles (`auth.users`) and provider accounts (`auth.accounts`)

**Multi-App OAuth Configuration**:

- **Per-App Provider Selection**: Each AppConfig defines which OAuth providers to enable (`auth.providers` array)
- **Multi-Client Support**: Same OAuth provider with different client credentials per app
- **Dynamic Provider Building**: Request-aware NextAuth configuration via `getProviders()` function
- **Frontend Filtering**: Login UI shows only configured providers for current app
- **Environment-Based Credentials**: Secure credential mapping (e.g., `APP1_GITHUB_CLIENT_ID`, `APP2_GOOGLE_CLIENT_ID`)

**OAuth Integration**:

- **Provider Setup**: GitHub OAuth 2.0 and Google OAuth 2.0/OpenID Connect with minimal scopes
- **Account Linking Logic**: Automatic linking for existing users, new user creation for first-time OAuth
- **Token Storage**: OAuth access/refresh tokens stored securely in database for API access
- **Error Handling**: Comprehensive OAuth error management with user-friendly messages
- **User Experience**: Account selection prompts, consistent UI patterns, loading state management

**Multi-Provider Authentication**:

- **GitHub OAuth**: Scopes (`read:user user:email`), profile mapping, account linking
- **Google OAuth**: Scopes (`openid profile email`), OpenID Connect, account selection prompts
- **Credentials**: bcrypt hashing, case-insensitive login, user enumeration protection
- **Account Unification**: Email-based linking allows users to authenticate via any linked provider

**Security Features**:

- **Password Security**: bcrypt hashing for credential authentication
- **Session Security**: HTTP-only cookies, automatic rotation, secure headers
- **OAuth Security**: Server-side token management, CSRF protection via NextAuth.js
- **Account Protection**: Prevents duplicate account linking, handles email conflicts gracefully

## Tech Stack Decisions

**Framework**: Next.js 14+ with App Router, TypeScript, React 18+
**UI**: Tailwind CSS, shadcn/ui (Radix UI primitives), next-themes
**Database**: PostgreSQL-only with Knex.js migrations
**Deployment**: Docker with Next.js standalone output, multi-stage builds
**Detailed dependencies**: See [DEPENDENCIES.md](./DEPENDENCIES.md)

## Production Deployment Architecture

**Pattern**: Docker-first with Next.js standalone output for optimized production containers

**Core Strategy**:

- **Multi-Stage Builds**: 4-stage Docker build for maximum optimization
- **Standalone Output**: Next.js self-contained bundles reduce image size by 75%
- **Health Monitoring**: Application and database health checks with automatic recovery
- **Security Hardening**: Non-root user execution, minimal attack surface, resource limits

**Production Infrastructure**:

- **Container Orchestration**: Docker Compose with service dependencies and health checks
- **Image Optimization**: Alpine Linux base, production-only dependencies, aggressive caching
- **Deployment Pipeline**: Automated via Makefile with health verification and monitoring
- **Performance**: ~300MB images (vs ~1.2GB standard), 45-60 second deployment pipeline

**Production Features**:

- **Health Endpoints**: `/api/health` for application monitoring
- **Resource Management**: Memory limits (512M app, 256M db) and automatic restarts
- **Security**: Non-root `nextjs:nodejs` user, network isolation, minimal base images
- **Monitoring**: Health checks, log aggregation, failure detection and recovery

## Database Architecture

**Design**: PostgreSQL-first, single database, schema-based isolation
**Configuration**: `PGSTRING` (required), `PGPOOL` (optional pool tuning)
**Access**: Singleton `getDB()` from `src/lib/db`, Knex migrations in `./knex/`
**Usage details**: See [docs/DATABASE.md](../docs/DATABASE.md)

## Theme Management

**Architecture**: `next-themes` with app-specific defaults via AppConfig
**Components**: `ThemeProvider` (SSR-safe), `ThemeToggle` (user control)
**Precedence**: User preference → App default → System preference
**Implementation details**: See [docs/THEMING.md](../docs/THEMING.md)

## Feature Flags & Security

**Route Control**: App-specific page/API whitelists in configuration
**Security**: Server-side validation, client protection, middleware enforcement
**Usage patterns**: See [docs/FEATURE_FLAGS.md](../docs/FEATURE_FLAGS.md)

## Development Standards

**Code Style**: Arrow functions, absolute imports with `@/` alias, strict TypeScript
**Component Pattern**: Always use folder organization for Open/Closed Principle
**Error Handling**: Consistent API responses, error boundaries, input validation
**Environment**: Document in `.env.example`, validate at startup, provide fallbacks

## Project Structure

```
├── PROJECT/              # Memory bank documentation
├── docs/                 # Detailed implementation guides
├── knex/                 # Database migrations and seeds
├── src/
│   ├── AppConfig.ts      # Multi-app configuration
│   ├── middleware.ts     # Request interception and app resolution
│   ├── app/              # Next.js app router structure
│   ├── components/       # Reusable components (folder-organized)
│   │   └── ui/           # shadcn/ui components
│   └── lib/              # Utility libraries
│       ├── db/           # Postgres related utilites
│       ├── auth/         # Auth related utilities
│       └── config/       # Multi-app related utilities
└── public/               # Static assets and theme CSS
```

## Architectural Constraints

**Multi-Tenancy**: App resolution via request properties, no shared state between apps
**Type Safety**: Full TypeScript across client/server, strict type checking
**Performance**: Static generation preferred, connection pooling, code splitting
**Accessibility**: WCAG AA compliance, keyboard navigation, semantic markup
**Security**: Server-side validation, input sanitization, secure headers

## CLI Integration

**Development**: `npm run lint && npm run build` (never `npm dev`, use `make app.start`)
**Database**: `npm run migrate` for schema changes
**Components**: `npx shadcn@latest add <component>` from project root

---

**Architectural Philosophy**: Favor explicit configuration over convention, server-side validation over client trust, type safety over runtime flexibility.

_Last Updated: July 6, 2025_
