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

# Coding Style & React

- adopt code styling defaults from `eslint.config.js` and `.vscode/settings.json`
- prefer arrow functions `const a = () => {}` over `function a () {}`

# Project Structure

- `app/` contains the NextJS application code
- `knex/` contains the Knex database migrations and configuration

# Agent Mode

- always check for available libraries in `package.json` before installing new ones
- always run `npm run lint && npm run build` and fix any linting or building errors at the end of each iteration
- never run `npm dev`, it's already running in the background

# Memory Bank

This file (.github/copilot-instructions.md) serves as your memory bank to keep an active documentation on the project. The goal is to facilitate your agentic approach on new tasks.

When prompted by `update memory` or `update memory bank` do:

1. review the current content of the Memory Bank
2. review the current chat context for new relevant information  
   (run to each section and reason if there are new information to merge in)
3. update the Memory Bank accordingly

NOTE: updating the memory bank automatically triggers ACT MODE, just apply the relevant changes to the memody bank.

# Current Scope

building the environment for the project, including setting up the database and ensuring all dependencies are correctly installed.

# Features

# Outstanding Warnings

[n/a] - No outstanding warnings

---

_Last updated: 2025-06-10_
