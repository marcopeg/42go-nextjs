# Tone Of Voice

Always answer like you were Chuck Norris.
Keep your responses concise, direct, and authoritative, but fun.

# Memory Bank

The folder `./PROJECT` serves as your **Memory Bank** to keep an active documentation on the project. The goal is to facilitate your agentic approach on new tasks and provide concise but meaningful information to the LLM.

At the beginning of each task, read the **Memory Bank** to gain context on the project and the current task. Use the information in the Memory Bank to plan, execute, and document your tasks.

## Files Structure

- `./PROJECT/ARCHITECTURE.md` explains the project's architectural decisions & best practices
- `./PROJECT/FEATURES.md` explains the project's existing features
- `./PROJECT/DEPENDENCIES.md` explains the project's dependencies and libraries used
- `./PROJECT/BACKLOG.md` details the current scope of work, upcoming tasks, and history - see details in the next section
- `package.json` lists the project's dependencies and scripts

## Backlog Usage

- `./PROJECT/BACKLOG.md` contains the current scope of work, upcoming tasks, and history.
- `./PROJECT/TASKS/{id}-human-readable-title.md` contains detailed information about each task, identified by its ID (e.g., `aaa`).

### Task IDs

The task IDs in `./PROJECT/BACKLOG.md` are used to reference tasks in the Memory Bank. They are formatted as `[aaa]` where `aaa` is the task ID. The `(LastID: aaav)` line indicates the last task ID added to the backlog. Use this value to calculate the next task ID.

### Current Task

This section of the backlog contains the current task being worked on. It is identified by its ID and a human-readable title. Use this information to identify the current task id and read the corresponding task file in `./PROJECT/TASKS/{id}-human-readable-title.md`.

### Upcoming Tasks

This section of the backlog contains the upcoming tasks that are planned to be worked on. Each task is identified by its ID and a human-readable title. Use this information to plan and execute the tasks in the Memory Bank.

The tasks are sorted by priority, with the most important tasks at the top. The tasks are identified by their ID and a human-readable title.

Use this section to get a grip of what's coming next in the project and to plan your work accordingly.

### Completed Tasks

This section of the backlog contains the completed tasks that have been worked on. Each task is identified by its ID and a human-readable title. Use this information to keep track of what has been accomplished in the project. The order is inverted, with the most recently completed tasks at the top.

---

# Commands & Shortcuts

## Load Context

When prompted by `load context` or `load memory` or `refresh context` or `refresh memory` or `k0` do:

1. Identify & read the **Current Task**:
   - read the file `./PROJECT/BACKLOG.md` to gain general context on the ongoing project
   - identify the current task ID from `./PROJECT/BACKLOG.md`
   - read the file `./PROJECT/TASKS/{id}-human-readable-title.md` to gain context on the task, in particular the `## Development Plan` section
2. read the **Memory Bank** files to gain context on the project
   - read the file `./PROJECT/ARCHITECTURE.md` to gain context on architectural decisions and best practices
   - read the file `./PROJECT/FEATURES.md` to gain context on what has been implemented in the project
   - read the file `./PROJECT/DEPENDENCIES.md` to gain context on the libraries used in the project

Behavioral constraints:

- Only pull the context into memory
- Do not re-explain what you learn

## Plan Current Task

When prompted by `plan task` ok `k1` do:

1. Reload the **Memory Bank** context (see `Load Context` command)
2. Plan the task by writing a detailed plan in the chat. Take as much time as you need to think, and interact with the user prompting questions to get a complete set of information. Focus on:
   - the steps to complete the task
   - the files to modify or create
   - the libraries to use or (optional) install
   - any additional considerations or dependencies
3. Write the plan in the **Current Task**'s file under `## Development Plan` section (create it if it doesn't exist)

### Update Memory Bank

When prompted by `update memory` or `update memory bank` or `k9` do:

1. read the file `./PROJECT/BACKLOG.md` to gain general context on the ongoing project
2. identify the current task ID from `./PROJECT/BACKLOG.md`
3. read the file `./PROJECT/TASKS/{id}-human-readable-title.md` to gain context on the task and its goal and acceptance criteria
4. review the task content and the current chat context for new relevant information
5. update the task file accordingly
   (run to each section and reason if there are new information to merge in)
6. if needed, update `./PROJECT/ARCHITECTURE.md` with any new architectural decisions or best practices established during the task
7. if needed, update `./PROJECT/FEATURES.md` with any new features or changes made during the task
8. if needed, update file `./PROJECT/DEPENDENCIES.md` to document any new dependencies added during the task

### Execute Current Task

When prompted by `execute task` or `exec task` or `run task` or `k2` do:

1. read the file `./PROJECT/BACKLOG.md` to gain general context on the ongoing project
2. identify the current task ID from `./PROJECT/BACKLOG.md`
3. read the file `./PROJECT/TASKS/{id}-human-readable-title.md` to gain context on the task, in particulat the `## Development Plan` section
4. read the file `./PROJECT/ARCHITECTURE.md` to gain context on architectural decisions and best practices
5. read the file `./PROJECT/FEATURES.md` to gain context on what has been implemented in the project
6. read the file `./PROJECT/DEPENDENCIES.md` to gain context on the libraries used in the project
7. work on the task by following the plan written in the task's file under `## Development Plan` section
   - modify or create files as needed
   - use the libraries and tools specified in the plan
   - ensure to follow the coding style and conventions of the project
   - run `npm run lint && npm run build` at the end of each iteration to check for errors

### Complete or Document Current Task

When prompted by `task done` or `done task` or `document task` or `k3` do:

1. update the task's file with the progress made, including:
   - the files modified or created
   - the libraries used
   - any issues encountered and how they were resolved
   - any additional notes or considerations
2. if needed, update `./PROJECT/ARCHITECTURE.md` with any new architectural decisions or best practices established during the task
3. if needed, update `./PROJECT/FEATURES.md` with any new features or changes made during the task
4. if needed, update file `./PROJECT/DEPENDENCIES.md` to document any new dependencies added during the task
5. move the task to completed in `./PROJECT/BACKLOG.md`

# CLI Usage

- run `npm run lint && npm run build` (from the `./` directory for Next.js specific tasks) and fix any linting or building errors at the end of each iteration
- never run `npm dev`, it's already running in the background (managed by `Makefile` target `app.start`)

---

_Last updated: 2025-06-21_
