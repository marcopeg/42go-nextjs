# Add `ARCHITECTURE.md` to the Memory Bank [aaav]

We have introduced a new _Memory Bank_ document called `ARCHITECTURE.md` that should contain relevant architectural decisions and list best practices that the LLM should follow.

We need to review content from the `.github/copilot-instructions.md` and move it into this other document.

Then we need to comprehensively review the project, probably have some interaction with the architect, collect ther information with the goal of completing this architectural document so that is meaningful for future tasks.

# Acceptance Criteria

- [ ] Complete the architectural document

## Development Plan

### Mission: Create Comprehensive Architecture Documentation

Chuck Norris has analyzed the entire codebase and identified the key architectural patterns that need to be documented for future development success.

### Steps to Complete:

1. **Create `PROJECT/ARCHITECTURE.md`** with comprehensive architectural documentation including:

   - Multi-App Configuration System architecture
   - Theme Management architecture
   - Database Layer design patterns
   - Server/Client configuration flow
   - Feature Flag architecture
   - Component organization standards
   - Development best practices and coding standards

2. **Extract Relevant Content** from `.github/copilot-instructions.md`:

   - Tech stack and libraries
   - Coding style guidelines
   - Project structure documentation
   - Development standards

3. **Document Core Architectural Decisions**:

   - Why the multi-app approach was chosen
   - Database architecture decisions (PostgreSQL-only, multi-schema for isolation)
   - Theme system implementation choices
   - Component architecture with shadcn/ui

4. **Establish Future Development Guidelines**:
   - Code organization patterns
   - Component development standards
   - Database interaction patterns
   - Configuration management approaches

### Key Architectural Patterns to Document:

- **Multi-App Configuration System**: Dynamic AppConfig resolution via middleware
- **Theme Management**: Enterprise-grade next-themes integration
- **Database Layer**: Knex.js PostgreSQL-focused implementation
- **Component Architecture**: shadcn/ui + custom component patterns
- **Feature Flags**: App-based page and API route control
- **TypeScript Integration**: Full type safety across the stack

### Technologies Integration:

- Next.js 14+ with App Router
- TypeScript for complete type safety
- Knex.js for database abstraction
- shadcn/ui + Radix UI for accessible components
- next-themes for theme management
- Tailwind CSS for utility-first styling

### Development Standards:

- Arrow functions preferred over function declarations
- Absolute imports with `@/` alias
- Component-based architecture
- Environment configuration with fallbacks
- ESLint and VSCode settings compliance

### Component Guidelines

Explain also that new components (being those components, pages, others) should be implemented as:

- ComponentName/
  - index.ts // exports the main component as default
  - ComponentName.tsx // containers, implements the component, no presentation logic here
  - ComponentNameUI.tsx // pure presentation logic
  - useComponentName.ts // custom hook to isolate the components data & business logic

It's important to note down that the LLM should follow this structure (hard separation in UI component and custom hooks) when it makes sense. If the component is minimal, or it's only presentational logic, it's ok to do in in the main file ComponentName/ComponentName.tsx - we want to keep the folder organization though so to implement the open/close principle.

---

This architecture document will serve as the definitive guide for all future development, ensuring consistency and maintaining the high-quality standards Chuck Norris demands!
