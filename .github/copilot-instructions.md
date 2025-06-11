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
- `src/app/`: Core application routes, layouts, and pages.
- `src/components/ui/`: Directory where shadcn/ui components are added (e.g., `button.tsx`). These are typically customized versions of Radix UI primitives, styled with Tailwind CSS.
- `src/lib/utils.ts`: Utility functions, including a `cn` helper function from shadcn/ui for conditional class names.
- `knex/` contains the Knex database migrations and configuration

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

Developing the Next.js application, integrating UI components using shadcn/ui, and managing the database with Knex. Ensuring all dependencies are correctly installed and the project builds successfully.

# Features

- Basic Next.js app structure created in `./`.
- `shadcn/ui` initialized within the `./` directory.
- `shadcn/ui` Button component added to `./src/components/ui/button.tsx` and integrated into `./src/app/page.tsx`.

# Outstanding Warnings

[n/a] - No outstanding warnings

---

_Last updated: 2025-06-11_
