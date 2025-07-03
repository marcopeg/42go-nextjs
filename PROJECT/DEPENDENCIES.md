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

**Purpose**: SQL query builder and migration manager providing a unified interface for multiple database engines.

**Key Features**:

- Multi-database support (PostgreSQL, MariaDB/MySQL, SQL Server, SQLite)
- Schema migration and seeding system
- Connection pooling and transaction support
- Promise-based query interface
- TypeScript support

**Why Chosen**:

- Mature and battle-tested SQL abstraction layer
- Excellent migration system for database schema management
- Support for multiple SQL databases with unified API
- Active community and comprehensive documentation
- Perfect fit for serverless and traditional deployment models

**Integration**:

- Database connection configuration in `src/lib/db/utils.ts`
- Singleton connection pool via `src/lib/db/index.ts`
- Migration files in `./knex/migrations/`
- CLI configuration in `knexfile.js`

**Related Database Packages**:

- **pg** (^8.16.0): PostgreSQL client driver
- **mysql2** (^3.14.1): MySQL/MariaDB client driver
- **sqlite3** (^5.1.7): SQLite3 client driver
- **better-sqlite3** (^12.2.0): High-performance SQLite3 driver
- **tedious** (^18.6.1): SQL Server client driver

**Project Configuration**:

- Single `DBSTRING` environment variable for database connection
- Optional pool tuning via `DB_POOL_*` environment variables
- Advanced configuration via optional `knex.config.json` file
- Automatic client detection based on connection string protocol
