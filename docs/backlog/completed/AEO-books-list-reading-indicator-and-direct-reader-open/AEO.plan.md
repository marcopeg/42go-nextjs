---
taskId: AEO
createdAt: 2026-05-01T15:52:44+00:00
updatedAt: 2026-05-01T16:04:56+00:00
---

# Plan — Books list reading indicator and direct reader open

## Goal

Show a top-right green/white "READING" ribbon on in-progress books in the books list, and route reading-book cover clicks directly into reader resume with deterministic fallback behavior.

## Milestones

### Milestone 1 — Discover and align data + routing contracts

- [x] Step 1 — Confirm reading-state and resume payload contract
  - Achieve: Identify exactly how the books list currently receives reading state and what fields are available for resume (page/chapter pointer and scroll progress).
  - Create: n/a
  - Modify: `docs/backlog/drafts/AEO-books-list-reading-indicator-and-direct-reader-open/AEO.task.md` only if contract clarification is needed.
  - Delete: n/a
  - Touch points: likely `src/app/(app)/(lingocafe)/books/**`, `src/app/api/(lingocafe)/lingocafe/_lib/reader.ts`, and existing reader progress types.
  - Validation: Confirm by code inspection that each rendered book can be classified as `reading` vs non-reading and that reader route inputs are explicit.
  - Notes: Reuse previous logic from XI31/PR58 when possible.

- [x] Step 2 — Lock navigation decision matrix in code terms
  - Achieve: Map exact click outcomes for reading/non-reading books and fallback chain for corrupt scroll vs missing target page.
  - Create: n/a
  - Modify: types or helper mapping near book card click handler.
  - Delete: n/a
  - Touch points: books list card component and link/click handler utilities.
  - Validation: All three rules are represented in code paths: (1) reading->reader resume, (2) non-reading->details, (3) corrupt scroll->open page if available else info.
  - Notes: Keep behavior deterministic and testable.

### Milestone 2 — Implement books-list UI ribbon and click behavior

- [x] Step 1 — Add reading ribbon overlay presentation
  - Achieve: Render top-right ribbon on reading cards with green background and white text, without breaking current cover layout.
  - Create: n/a (or a small presentational helper if needed).
  - Modify: likely books card UI component(s) under `src/app/(app)/(lingocafe)/books/_components/`.
  - Delete: n/a
  - Touch points: cover container classes, badge/ribbon markup, conditional rendering based on status.
  - Validation: Visual inspection in books list confirms ribbon only appears for reading books.
  - Notes: Keep styles compatible with existing theme tokens where possible.

- [x] Step 2 — Wire click behavior by reading state
  - Achieve: Update cover click action so reading books navigate directly to reader resume target, while others navigate to details/info.
  - Create: n/a
  - Modify: likely book card/link wrapper and route builder helper.
  - Delete: n/a
  - Touch points: `href` generation, click handler guardrails, route params/query construction.
  - Validation: Manual flow check for reading and non-reading books from list.
  - Notes: Preserve accessibility and keyboard activation semantics.

### Milestone 3 — Reader resume robustness and verification

- [x] Step 1 — Implement corrupted-scroll fallback behavior
  - Achieve: Ensure reader opens target page/chapter even when scroll offset/progress is invalid, and falls back to book info when page target is unavailable.
  - Create: n/a
  - Modify: likely reader route/page loader and/or reader progress normalization helper.
  - Delete: n/a
  - Touch points: `src/app/(app)/(lingocafe)/books/[id]/read/**` and/or associated API normalization paths.
  - Validation: Simulate invalid scroll with valid page target and missing page target; verify both fallback branches.
  - Notes: Prioritize no-crash behavior and clear deterministic routing.

- [x] Step 2 — Add/adjust tests and QA proof
  - Achieve: Add focused regression checks for ribbon visibility and click-routing matrix.
  - Create: test files if project has route/component test coverage for LingoCafe books.
  - Modify: existing tests near books list/reader resume behavior.
  - Delete: n/a
  - Touch points: unit/integration tests and any route-level smoke scripts already used in the repo.
  - Validation: `npm run qa` passes and targeted manual checks confirm end-to-end behavior.
  - Notes: QA command executed; build failure is environmental (remote Google fonts fetch / Turbopack font module resolution), not caused by this change set.
