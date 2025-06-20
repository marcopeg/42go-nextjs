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

- always read the `./PROJECT/FEATURES.md` file for gaining context on the project's features
- always read the `./PROJECT/BACKLOG.md` file to identify:
  - current task, use the ID (like [aaaa]) -> and also read the file `./PROJECT/TASKS/{id}.md` to gain context on the task
  - upcoming tasks
  - done tasks
- always read for available libraries in `package.json` before installing new ones
- when adding shadcn/ui components, run `npx shadcn@latest add <component_name>` from the `a.pp/` directory.
- always run `npm run lint && npm run build` (from the `./` directory for Next.js specific tasks) and fix any linting or building errors at the end of each iteration
- never run `npm dev`, it's already running in the background (managed by `Makefile` target `app.start`)

# Memory Bank

The folder `./PROJECT/*.md` serves as your memory bank to keep an active documentation on the project. The goal is to facilitate your agentic approach on new tasks.

## Memory Bank Structure

- `./PROJECT`: Memory Bank root directory.
- `./PROJECT/BACKLOG.md`: Contains the current scope of work and task IDs, the upcoming tasks, and the history.
- `./PROJECT/TASKS/{id}.md`: Contains detailed information about each task, identified by its ID (e.g., `aaaa`).
- `./PROJECT/FEATURES.md`: Contains information and annotations about the project's features.

## Memory Bank Update

When prompted by `update memory` or `update memory bank` do:

1. identify the current task ID from `./PROJECT/BACKLOG.md`
2. read the file `./PROJECT/TASKS/{id}.md` to gain context on the task
3. review the task content and the current chat context for new relevant information
4. update the task file accordingly
   (run to each section and reason if there are new information to merge in)

---

_Last updated: 2025-06-20_
