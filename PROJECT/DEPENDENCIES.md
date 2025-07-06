# Dependencies

Essential libraries and their integration context in the 42Go Next project.

## Core Framework

### Next.js

🔗 https://nextjs.org/  
**Purpose**: Full-stack TypeScript framework with App Router
**Integration**: Project foundation with SSR, routing, and build optimization

### TypeScript

**Purpose**: Complete type safety across client and server
**Integration**: Strict type checking, interfaces, and compile-time validation

## UI & Styling

### Tailwind CSS

🔗 https://tailwindcss.com/  
**Purpose**: Utility-first CSS framework
**Integration**: `darkMode: ["class"]` configuration for theme system

### shadcn/ui

🔗 https://ui.shadcn.com/  
**Purpose**: Accessible components built on Radix UI primitives
**Integration**: `src/components/ui/`, install via `npx shadcn@latest add <component>`
**Key**: Run from project root, fully themed automatically

### next-themes (^0.4.6)

🔗 https://github.com/pacocoursey/next-themes  
**Purpose**: SSR-safe theme management with localStorage persistence
**Integration**: `ThemeProvider` with AppConfig defaults, class-based switching
**Why**: Industry standard, hydration-safe, perfect Tailwind integration

## Database & Backend

### Knex.js (^3.1.0)

🔗 https://knexjs.org/  
**Purpose**: PostgreSQL query builder and migration system
**Integration**: Singleton pattern via `getDB()`, migrations in `./knex/`
**Configuration**: `PGSTRING` + optional `PGPOOL`, `serverExternalPackages: ["knex"]`
**Why**: PostgreSQL-focused, excellent migrations, Next.js compatible

### pg (^8.16.0)

**Purpose**: PostgreSQL client driver (production dependency)
**Integration**: Used by Knex for database connections

## Authentication

### NextAuth.js (^4.24.11)

🔗 https://next-auth.js.org/  
**Purpose**: Enterprise authentication with JWT sessions
**Integration**: `src/lib/auth/authOptions.ts`, automatic session management
**Configuration**: 30-day max, 30-minute refresh, HTTP-only cookies
**Why**: Industry standard, extensible (social login ready), zero-config security

### bcrypt

**Purpose**: Password hashing and verification
**Integration**: Database authentication in NextAuth credentials provider

### @types/bcrypt

**Purpose**: TypeScript definitions for bcrypt
**Integration**: Dev dependency for type-safe password operations

## Development

### ESLint

**Purpose**: Code quality and consistency
**Integration**: Custom config with arrow function preferences, absolute imports

---

**Dependency Philosophy**: Prefer mature, well-maintained libraries with excellent TypeScript support and Next.js integration. Avoid experimental packages in favor of industry standards.

**Installation Notes**:

- shadcn/ui: Always run from project root
- Database: PostgreSQL-only focus, no multi-database complexity
- Authentication: JWT-first, extensible for future social providers
