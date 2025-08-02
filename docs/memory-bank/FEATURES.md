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

## UI & Layout System

### Public Layout System

**Capability**: Modular, responsive public layout for landing pages and marketing sites
**Implementation**: `/src/components/layouts/public/` with Header, Footer, and PublicLayout components
**Features**: App-specific layout customization, mobile-first responsive design, SSR-ready
**Customization**: Each AppConfig can define custom `theme.PublicLayout` component
**Components**: Header with branding, Footer with links/utilities, responsive navigation

### CMS-Driven Page System

**Capability**: Type-safe, configuration-driven content management for dynamic pages
**Implementation**: Page component with extensible content block architecture
**Features**: Dynamic routing, metadata integration, extensible block system
**Content Blocks**: TextBlock, HeroBlock, DemoBlock with type-safe rendering
**Architecture**: Centralized types in `/src/components/Page/types.ts`

### Dynamic Routing System

**Capability**: Automatic page generation from configuration without explicit route files
**Implementation**: Catch-all route `[...slug]/page.tsx` with URL-to-config mapping
**Features**: Case-insensitive routing, metadata generation, feature flag integration
**URL Mapping**: `/foo/bar-beer` → `"foo/bar-beer"` config key lookup
**404 Handling**: Automatic fallback when no configuration found

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

### GitHub OAuth Integration

**Capability**: Social login with GitHub OAuth 2.0 provider
**Implementation**: NextAuth.js GitHub provider with account linking strategy
**Features**: Automatic account linking by email, JWT session compatibility, secure token storage
**Database**: `auth.accounts` table for OAuth provider links, `auth.users` for unified profiles
**Security**: Minimal OAuth scopes (`read:user user:email`), server-side token management
**UI**: Modern login interface with loading states and comprehensive error handling

### Multi-App OAuth Integration

**Capability**: Per-app OAuth provider configuration with multi-client support
**Implementation**: Dynamic NextAuth configuration via AppConfig-driven provider building
**Features**: App-specific provider selection, separate OAuth credentials, frontend filtering, environment-based configuration
**Security**: Separate OAuth applications per app, secure credential management, HTTPS-only production flows
**UI**: Login interface shows only configured providers per app, consistent OAuth branding
**Account Management**: Email-based linking across providers, unified user profiles, seamless provider switching
**Setup guide**: See [docs/MULTI_APP_OAUTH_SETUP.md](../docs/MULTI_APP_OAUTH_SETUP.md)

### Enhanced Feature Flag System

**Capability**: URL-based dynamic feature flag calculation for config-driven pages
**Implementation**: Enhanced `appPage` wrapper with `"url!"` syntax and middleware support
**Features**: Dynamic flag calculation from URL, consistent with page routing logic
**Usage**: `appPage(Component, "url!")` automatically checks feature flags based on current URL
**Integration**: Middleware sets `x-pathname` header, wrapper calculates flags dynamically

### Configuration-Based Feature Flags

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

## Production & Deployment

### Optimized Production Builds

**Capability**: Docker-based production deployment with Next.js standalone output
**Implementation**: Multi-stage Docker builds with 75% image size reduction
**Features**: Self-contained applications, security hardening, health monitoring, resource management
**Performance**: ~300MB images (vs ~1.2GB standard), 45-60 second deployment pipeline
**Architecture**: 4-stage builds (deps → build-deps → builder → runner) with aggressive optimization
**Deployment guide**: See [docs/PRODUCTION_DEPLOYMENT.md](../docs/PRODUCTION_DEPLOYMENT.md)

### Production Infrastructure

**Capability**: Complete production deployment automation via Makefile
**Implementation**: Docker Compose orchestration with health checks and monitoring
**Features**: Health endpoints (`/api/health`), automatic restarts, resource limits, log management
**Security**: Non-root user execution, network isolation, minimal attack surface
**Commands**: `make prod` (complete pipeline), `make prod.health` (monitoring), `make prod.logs` (debugging)
**Monitoring**: Application and database health checks with automatic failure recovery

---

**Feature Integration**: All features work together through the AppConfig system, enabling different feature sets per application while maintaining shared infrastructure.

_For detailed implementation guides, see the `docs/` directory._

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

### 5. CMS Architecture

**Pattern**: Type-safe, configuration-driven content management with dynamic routing

**Core Components**:

- **Page Component**: Renders CMS content blocks from configuration (`/src/components/Page/`)
- **Content Blocks**: Extensible block system (TextBlock, HeroBlock, DemoBlock, etc.)
- **Type System**: Centralized CMS types in single source of truth (`Page/types.ts`)
- **Dynamic Routing**: Catch-all route `[...slug]/page.tsx` for config-driven pages

**URL-to-Config Mapping**:

- Simple path preservation: `/foo/bar-beer` → `"foo/bar-beer"` config key
- Case-insensitive lookup for better UX
- Consistent between routing and feature flag systems

**Metadata Integration**:

- Dynamic page titles and descriptions from CMS configuration
- SEO-friendly metadata generation via Next.js `generateMetadata`
- Per-page metadata override support

### 7. Authentication Architecture

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
