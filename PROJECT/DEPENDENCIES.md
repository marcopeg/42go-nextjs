# Dependencies

This files contains brief explanation of the dependencies of the app.

## NextJS

🔗 https://nextjs.org/

Full stack Typescript framework.

## Tailwind

🔗 https://tailwindcss.com/

## ShadCN

🔗 https://ui.shadcn.com/docs/installation

**IMPORTANT:** when adding shadcn/ui components, run `npx shadcn@latest add <component_name>` from the `root` directory.

## next-themes

🔗 https://github.com/pacocoursey/next-themes

**Version**: ^0.4.6

**Purpose**: Robust theme management for Next.js applications with perfect support for SSR/SSG.

**Key Features**:

- Automatic system theme detection
- Theme persistence via localStorage
- Hydration-safe theme switching
- TypeScript support
- Zero-config setup with sensible defaults

**Why Chosen**:

- Industry standard for Next.js theme management
- Excellent SSR/hydration handling prevents flash of incorrect theme
- Lightweight and performant
- Active maintenance and community support
- Perfect integration with Tailwind CSS class-based dark mode

**Integration**:

- Used in `src/lib/config/ThemeProvider.tsx` as the core theme provider
- Configured with class-based theme switching (`attribute="class"`)
- Integrated with Tailwind's `darkMode: ["class"]` configuration
- Provides theme context throughout the application via React Context

## Knex.js

🔗 https://knexjs.org/

**Version**: ^3.1.0

**Purpose**: SQL query builder and migration manager providing a unified interface for PostgreSQL database operations.

**Key Features**:

- PostgreSQL-focused database abstraction
- Schema migration and seeding system
- Connection pooling and transaction support
- Promise-based query interface
- TypeScript support

**Why Chosen**:

- Mature and battle-tested SQL abstraction layer
- Excellent migration system for database schema management
- Perfect for PostgreSQL-focused applications
- Active community and comprehensive documentation
- Perfect fit for serverless and traditional deployment models

**Integration**:

- Database connection configuration in `src/lib/db/utils.ts`
- Singleton connection pool via `src/lib/db/index.ts`
- Migration files in `./knex/migrations/`
- CLI configuration in `knexfile.js`

**Related Database Packages**:

- **pg** (^8.16.0): PostgreSQL client driver (production dependency)
- **pg-query-stream** (^4.10.3): Streaming query support for large PostgreSQL result sets

**Build Configuration**:

Instead of installing unused database drivers, we use the official Next.js solution:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["knex"],
};
```

**Why This Solution**:

- **Official**: Uses documented Next.js approach for external packages
- **Clean**: No need to install unused database drivers
- **Maintainable**: Leverages official Next.js recommendations
- **Performance**: Prevents Next.js from bundling all Knex dialects
- **Future-proof**: Follows official guidelines

**Project Configuration**:

- Single `PGSTRING` environment variable for PostgreSQL connection
- Optional pool tuning via `PGPOOL` environment variable (comma-separated: min,max,idleTimeoutMillis)
- Advanced configuration via optional `knex.config.json` file
- PostgreSQL-only support with automatic connection string parsing
