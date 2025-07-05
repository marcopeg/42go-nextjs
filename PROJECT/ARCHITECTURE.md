# Architecture Documentation

This document contains the comprehensive architectural decisions, patterns, and best practices for the 42Go Next project - a multi-tenant NextJS boilerplate that supports dynamic configuration, theming, user management, and RBAC control.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Core Architectural Patterns](#core-architectural-patterns)
- [Component Architecture](#component-architecture)
- [Development Standards](#development-standards)
- [Database Architecture](#database-architecture)
- [Theme Management](#theme-management)
- [Feature Flags & Security](#feature-flags--security)
- [Project Structure](#project-structure)
- [Best Practices](#best-practices)

## Project Overview

42Go Next is designed as a multi-tenant NextJS boilerplate that enables running completely different SaaS applications from the same codebase. The architecture emphasizes:

- **Dynamic Configuration**: Request-based app identification and configuration
- **Enterprise Theming**: Comprehensive light/dark theme system with app-specific defaults
- **Database Flexibility**: PostgreSQL-focused with robust migration system
- **Component Modularity**: Clean separation of concerns with presentation/logic isolation
- **Type Safety**: Full TypeScript integration across the entire stack
- **Feature Control**: Granular page and API route control via feature flags

## Tech Stack

### Core Framework

- **Next.js 14+** - Full-stack React framework with App Router
- **TypeScript** - Complete type safety across client and server
- **React 18+** - Component-based UI with modern hooks and patterns

### UI & Styling

- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality accessible components built on Radix UI
- **Radix UI** - Unstyled, accessible UI primitives
- **next-themes** - Enterprise-grade theme management

### Database & Backend

- **Knex.js** - SQL query builder and migration system
- **PostgreSQL** - Primary database (single-database architecture)
- **pg** - PostgreSQL client driver

### Development Tools

- **ESLint** - Code quality and consistency
- **Prettier** - Code formatting (via ESLint integration)

## Core Architectural Patterns

### 1. Multi-App Configuration System

The heart of the architecture is a sophisticated multi-tenant system that resolves application configuration dynamically based on request properties.

#### Architecture Flow:

```
Request → Middleware → AppConfig Resolution → Header Injection → Server/Client Components
```

#### Key Components:

**`src/AppConfig.ts`**

- Defines `AppConfigItem` interface and available app configurations
- Contains `availableApps` dictionary with app-specific settings
- Exports `matchAppName()` function for request-based app resolution

**`src/middleware.ts`**

- Intercepts all requests (except static files)
- Calls `matchAppName()` to resolve app based on hostname, headers, etc.
- Injects `X-App-Name` header with resolved app name

**Server-Side Access:**

- Server components read the `X-App-Name` header
- Look up full configuration from `availableApps` dictionary

**Client-Side Access:**

- App name passed via script tag in root layout
- Client components use React Context to access configuration

#### Benefits:

- **Performance**: Avoids serializing full config objects
- **Flexibility**: Dynamic app resolution per request
- **Scalability**: Single codebase for multiple SaaS applications
- **Security**: Server-side configuration validation

### 2. Feature Flag Architecture

Granular control over pages and API routes through app-specific feature flags.

#### Implementation:

- Each app config contains `featureFlags.pages` and `featureFlags.apis` arrays
- Middleware validates route access based on current app configuration
- Supports wildcard (`*`) for full access or specific route lists
- Enables fine-grained multi-tenant feature control

### 3. Server/Client Configuration Bridge

Elegant solution for sharing configuration between server and client without performance overhead.

#### Pattern:

1. Server resolves app name from request
2. App name injected via header for server components
3. App name passed to client via script tag
4. Client looks up full config from static dictionary
5. React Context provides app config throughout component tree

## Component Architecture

### Component Organization Structure

All components should follow the **Container/Presentation/Logic** separation pattern for maintainability and reusability:

```
ComponentName/
├── index.ts                 // Default export of main component
├── ComponentName.tsx        // Container component (no presentation logic)
├── ComponentNameUI.tsx      // Pure presentation component (UI only)
└── useComponentName.ts      // Custom hook (data & business logic)
```

### Component Guidelines

#### When to Use Full Structure:

- Complex components with business logic
- Components that manage state
- Components with data fetching
- Reusable components across multiple apps

#### Simplified Structure Exception:

For minimal or purely presentational components:

```
ComponentName/
├── index.ts                 // Default export
└── ComponentName.tsx        // All logic in single file
```

**Important**: Always use folder organization to maintain the Open/Closed Principle and enable future expansion.

### Component Development Patterns

#### Container Component (`ComponentName.tsx`)

```typescript
import { useComponentName } from "./useComponentName";
import { ComponentNameUI } from "./ComponentNameUI";

export const ComponentName = () => {
  const logic = useComponentName();
  return <ComponentNameUI {...logic} />;
};
```

#### Presentation Component (`ComponentNameUI.tsx`)

```typescript
interface ComponentNameUIProps {
  // Pure props interface - no business logic
}

export const ComponentNameUI: React.FC<ComponentNameUIProps> = (props) => {
  // Only presentation logic here
  return <div>...</div>;
};
```

#### Custom Hook (`useComponentName.ts`)

```typescript
export const useComponentName = () => {
  // All business logic, state management, side effects
  // Return only what the UI needs
  return {
    // UI props
  };
};
```

### shadcn/ui Integration

- **Installation**: Run `npx shadcn@latest add <component_name>` from project root
- **Location**: Components added to `src/components/ui/`
- **Customization**: Modify components as needed for app-specific requirements
- **Theming**: Fully integrated with Tailwind and theme system

## Development Standards

### Code Style

#### Function Declarations

```typescript
// ✅ Preferred: Arrow functions
const handleClick = () => {
  // implementation
};

// ❌ Avoid: Function declarations
function handleClick() {
  // implementation
}
```

#### Imports

```typescript
// ✅ Use absolute imports with @/ alias
import { ComponentName } from "@/components/ComponentName";
import { useAppConfig } from "@/lib/config/use-app-config";

// ❌ Avoid relative imports for src/ files
import { ComponentName } from "../../../components/ComponentName";
```

#### TypeScript

- Always use TypeScript for all files
- Define proper interfaces for all props and return types
- Use strict type checking
- Leverage type inference where appropriate

### Environment Configuration

- **Required Variables**: Document in `.env.example`
- **Fallback Values**: Provide sensible defaults where possible
- **Validation**: Validate required environment variables at startup
- **Security**: Never expose sensitive config to client-side

### Error Handling

- **API Routes**: Return consistent error response format
- **Client Components**: Use error boundaries for graceful degradation
- **Database**: Handle connection failures and transaction rollbacks
- **Validation**: Validate inputs at boundaries (API routes, forms)

## Database Architecture

### PostgreSQL-First Approach

#### Design Decisions:

- **Single Database**: Simplified configuration and deployment
- **Schema-Based Isolation**: Future multi-tenancy via PostgreSQL schemas
- **Migration System**: Knex.js for version-controlled schema changes
- **Connection Pooling**: Production-ready connection management

#### Configuration:

```bash
# Required
PGSTRING="postgres://user:password@host:port/database"

# Optional - Connection pool tuning
PGPOOL="2,10,30000"  # min,max,idleTimeoutMillis
```

#### Database Access Pattern:

```typescript
// In API routes or server components
import { getDB } from "@/lib/db";

export async function GET() {
  const db = getDB();
  const results = await db("table_name").select();
  return Response.json({ results });
}
```

### Migration Management

- **Location**: `./knex/migrations/`
- **Naming**: `YYYYMMDD_descriptive_name.js`
- **CLI**: Use `npm run migrate` for deployment
- **Rollback**: Knex supports migration rollbacks for development

### Database Best Practices

- **Transactions**: Use for multi-table operations
- **Indexing**: Create indexes for frequently queried columns
- **Validation**: Database constraints + application validation
- **Performance**: Connection pooling and query optimization

## Theme Management

### Enterprise-Grade Theme System

Built on `next-themes` with comprehensive app-specific customization.

#### Architecture Components:

**`ThemeProvider`** (`src/lib/config/ThemeProvider.tsx`)

- Wraps entire application
- Handles SSR/hydration safely
- Integrates with app configuration

**`ThemeToggle`** (`src/lib/config/ThemeToggle.tsx`)

- Dropdown-based theme switcher
- Light/Dark/System options
- Persistent user preferences

#### Theme Configuration:

```typescript
// In AppConfig
interface AppConfigItem {
  theme?: {
    default?: "light" | "dark" | "system";
  };
}
```

#### CSS Integration:

- **Tailwind**: `darkMode: ["class"]` configuration
- **CSS Variables**: Using modern `oklch()` color space
- **Components**: All shadcn/ui components themed automatically

#### Precedence Order:

1. User preference (localStorage)
2. App default (from configuration)
3. System preference

## Feature Flags & Security

### Route-Level Feature Control

#### Page Protection:

```typescript
// In app config
featureFlags: {
  pages: ["*"],           // All pages allowed
  pages: ["/dashboard"],  // Specific pages only
  pages: [],             // No pages allowed
}
```

#### API Protection:

```typescript
// In app config
featureFlags: {
  apis: ["*"],              // All APIs allowed
  apis: ["/api/users"],     // Specific APIs only
  apis: [],                // No APIs allowed
}
```

### Security Considerations

- **Server-Side Validation**: All feature flags validated server-side
- **Client Protection**: UI elements hidden based on permissions
- **API Security**: Middleware enforces API route permissions
- **Header Security**: App resolution happens in secure middleware

## Project Structure

```
├── PROJECT/                 # Memory bank documentation
├── knex/                   # Database migrations and seeds
├── src/
│   ├── AppConfig.ts        # Multi-app configuration
│   ├── middleware.ts       # Request interception and app resolution
│   ├── app/               # Next.js app router structure
│   ├── components/        # Reusable components
│   │   └── ui/           # shadcn/ui components
│   └── lib/              # Utility libraries
│       ├── config/       # Configuration utilities
│       └── db/           # Database utilities
├── docs/                  # Project documentation
└── public/               # Static assets and theme CSS
```

### Key Files:

- **`components.json`**: shadcn/ui configuration
- **`knexfile.js`**: Database CLI configuration
- **`tailwind.config.js`**: Tailwind and theme configuration
- **`next.config.ts`**: Next.js build configuration
- **`eslint.config.mjs`**: Code quality rules

## Best Practices

### Performance

- **Static Generation**: Use SSG where possible
- **Image Optimization**: Leverage Next.js Image component
- **Bundle Optimization**: Code splitting and lazy loading
- **Database**: Connection pooling and query optimization

### Accessibility

- **shadcn/ui**: Built on accessible Radix primitives
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: Proper ARIA labels and semantics
- **Color Contrast**: WCAG AA compliance in all themes

### SEO

- **Metadata**: App-specific meta tags from configuration
- **Structured Data**: JSON-LD for enhanced search results
- **Performance**: Core Web Vitals optimization
- **Mobile**: Responsive design and mobile-first approach

### Security

- **Environment Variables**: Secure configuration management
- **Input Validation**: Server and client-side validation
- **CORS**: Proper cross-origin request handling
- **Headers**: Security headers in middleware

### Maintenance

- **Documentation**: Keep architecture docs updated
- **Dependencies**: Regular updates and security patches
- **Testing**: Comprehensive test coverage (future enhancement)
- **Monitoring**: Error tracking and performance monitoring

## CLI Usage Guidelines

### Development Commands

```bash
# Linting and building (always run at end of development cycles)
npm run lint && npm run build

# Never run npm dev (managed by Makefile)
# Development server handled by: make app.start

# Database migrations
npm run migrate

# Add shadcn/ui components
npx shadcn@latest add <component_name>
```

### Memory Bank Commands

- **`k0`** or **`update memory`**: Update memory bank with current progress
- **`k1`** or **`plan task`**: Plan current task from backlog
- **`k2`** or **`execute task`**: Execute planned task
- **`k3`** or **`task done`**: Document completion and update memory bank

---

_This architecture serves as the definitive guide for all development on the 42Go Next project. Follow these patterns to maintain consistency, scalability, and the high-quality standards that make this codebase as reliable as Chuck Norris himself._

**Last Updated**: July 5, 2025
