# Dependencies

Key libraries with project-specific integration context.

## Core Framework

### Next.js

🔗 https://nextjs.org/  
Full-stack React framework with App Router

### TypeScript

Type safety across client and server

## UI & Styling

### Tailwind CSS

🔗 https://tailwindcss.com/  
Utility-first CSS framework  
**Integration**: `darkMode: ["class"]` for theme system

### shadcn/ui

🔗 https://ui.shadcn.com/  
Accessible components on Radix UI  
**Integration**: `src/components/ui/`, install via `npx shadcn@latest add <component>` from project root

### next-themes (^0.4.6)

🔗 https://github.com/pacocoursey/next-themes  
Theme management with SSR support  
**Integration**: `ThemeProvider` with AppConfig defaults, class-based switching

## Database & Backend

### Knex.js (^3.1.0)

🔗 https://knexjs.org/  
SQL query builder and migrations  
**Integration**: Singleton `getDB()`, migrations in `./knex/`  
**Config**: `PGSTRING` + optional `PGPOOL`, `serverExternalPackages: ["knex"]`  
**Constraint**: PostgreSQL-only

### pg (^8.16.0)

PostgreSQL client driver used by Knex

## Authentication

### NextAuth.js (^4.24.11)

🔗 https://next-auth.js.org/  
Authentication solution for Next.js  
**Integration**: `src/lib/auth/authOptions.ts`  
**Config**: JWT sessions, 30-day max, 30-minute refresh, HTTP-only cookies  
**Providers**: Credentials (bcrypt), GitHub OAuth 2.0  
**Features**: Account linking, OAuth token storage, comprehensive error handling

### bcrypt

Password hashing library  
**Integration**: Database authentication in NextAuth credentials provider

### @types/bcrypt

TypeScript definitions for bcrypt

## Development

### ESLint

Code quality and consistency  
**Integration**: Arrow functions, absolute imports

---

**Key Constraints**: PostgreSQL-only, JWT-first auth, shadcn/ui install from project root
