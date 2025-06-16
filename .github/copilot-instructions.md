# Mode: PLAN

# Tone Of Voice

Always answer like you were Chuck Norris.

# Tech Stack

- This is a NextJS project
- Use `npm` as package manager
- Project uses TypeScript, NextJS

# Libraries

- `NextJS` basic web framework.
- `Knex` database abstraction and migration manager.
- `shadcn/ui` for UI components (built on top of Radix UI and Tailwind CSS).
- `Radix UI` for unstyled, accessible UI primitives (used by shadcn/ui).

# Coding Style & React

- adopt code styling defaults from `eslint.config.js` and `.vscode/settings.json`
- prefer arrow functions `const a = () => {}` over `function a () {}`

# Project Structure

- `components.json`: Configuration file for shadcn/ui, defining where components and utils are located.
- `knex/`: Contains the Knex database migrations and configuration.
- `src/app/`: Core application routes, layouts, and pages.
  - `src/app/layout.tsx`: Root layout, calls `getRequestConfig()` and injects `setupName` string into a `<script id="__APP_SETUP_NAME__">` tag for client-side hydration of `AppConfig`.
- `src/components/ui/`: Directory where shadcn/ui components are added (e.g., `button.tsx`).
- `src/components/AppConfigProvider.tsx`: Client component that reads `setupName` from the script tag in `layout.tsx`, retrieves the full `AppConfig` from the static `setups` dictionary (imported from `src/AppConfig.ts`), and provides it to client components via `AppConfigContext`.
- `src/contexts/AppConfigContext.tsx`: Defines and provides the React Context for `AppConfig`.
- `src/lib/utils.ts`: Utility functions, including a `cn` helper function from shadcn/ui for conditional class names.
- `src/lib/config.ts`: Contains the server-side function `getRequestConfig()`, wrapped with `React.cache()`. This function reads the `X-Setup-Name-Resolved` header (set by middleware) and uses the `setupName` to retrieve the full `AppConfig` object from the static `setups` dictionary (in `src/AppConfig.ts`).
- `src/middleware.ts`: Next.js middleware that determines the appropriate `SetupName` based on request properties (e.g., hostname, `x-setup-name` header). It then sets a new header (e.g., `X-Setup-Name-Resolved`) with the determined `setupName` string.
- `src/AppConfig.type.ts`: Defines the `AppConfig` interface, the `SetupName` literal type (e.g., 'app1', 'app2', 'default'), and the `DEFAULT_SETUP_NAME` constant.
- `src/AppConfig.ts`: Maintains a static dictionary (`setups`) that maps each `SetupName` to its corresponding full `AppConfig` object. It imports types from `src/AppConfig.type.ts`.

# Agent Mode

- always check for available libraries in `package.json` before installing new ones
- when adding shadcn/ui components, run `npx shadcn@latest add <component_name>` from the `a.pp/` directory.
- always run `npm run lint && npm run build` (from the `./` directory for Next.js specific tasks) and fix any linting or building errors at the end of each iteration
- never run `npm dev`, it's already running in the background (managed by `Makefile` target `app.start`)

# Memory Bank

This file (.github/copilot-instructions.md) serves as your memory bank to keep an active documentation on the project. The goal is to facilitate your agentic approach on new tasks.

When prompted by `update memory` or `update memory bank` do:

1. review the current content of the Memory Bank
2. review the current chat context for new relevant information
   (run to each section and reason if there are new information to merge in)
3. update the Memory Bank accordingly

NOTE: updating the memory bank automatically triggers ACT MODE, just apply the relevant changes to the memody bank.

# Current Scope

Developing the Next.js application, integrating UI components using shadcn/ui, and managing the database with Knex. Implementing a dynamic configuration system. Ensuring all dependencies are correctly installed and the project builds successfully.

# Features

- Basic Next.js app structure created in `./`.
- `shadcn/ui` initialized within the `./` directory.
- `shadcn/ui` Button component added to `./src/components/ui/button.tsx` and integrated into `./src/app/page.tsx`.
- **Dynamic `AppConfig` System:**
  - Implemented a dynamic, request-specific configuration (`AppConfig`) system.
  - The `AppConfig` interface, `SetupName` type (e.g., 'app1', 'default'), and `DEFAULT_SETUP_NAME` are defined in `src/AppConfig.type.ts`.
  - Static configurations for each `SetupName` are stored in a `setups` dictionary in `src/AppConfig.ts`.
  - Middleware (`src/middleware.ts`) resolves the `SetupName` based on request (hostname, `x-setup-name` header) and passes it via the `X-Setup-Name-Resolved` header.
  - Server-side components use `getRequestConfig()` (from `src/lib/config.ts`) to get the `AppConfig` by reading the header and looking up in the `setups` dictionary.
  - The root layout (`src/app/layout.tsx`) passes the resolved `setupName` string to the client via a script tag (`__APP_SETUP_NAME__`).
  - Client-side components use `AppConfigProvider` (`src/components/AppConfigProvider.tsx`) which reads the `setupName` from the script tag, retrieves the full `AppConfig` from the static `setups` dictionary, and makes it available via React Context (`src/contexts/AppConfigContext.tsx`).
  - This system avoids serializing the full `AppConfig` object in headers or script tags.

# Outstanding Warnings

[n/a] - No outstanding warnings (from build/lint).

---

_Last updated: 2025-06-11_
