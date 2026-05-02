---
taskId: AEO
status: completed
createdAt: 2026-05-01T15:26:12+00:00
updatedAt: 2026-05-02T05:20:15+02:00
reviewedAt: 2026-05-01T15:40:52+00:00
plannedAt: 2026-05-01T15:52:44+00:00
startedAt: 2026-05-01T16:04:56+00:00
completedAt: 2026-05-02T05:20:15+02:00
---

# Books list reading indicator and direct reader open

## Elevator's Pitch

Add a visible "reading" indicator band on book covers in the books list, and make clicking covers for books currently being read jump straight into the reader page at the correct saved scroll position.

## Business Gain

Readers can instantly spot in-progress books and resume without extra clicks, reducing friction and improving return engagement for active learners.

## Current State

Books are listed with cover cards, but the draft request indicates the reading status is not clearly overlaid as a cover band in the list and clicking a currently-reading book does not yet guarantee direct resume in the reader at the correct scroll point.

## Desired State

Books with status "reading" render a top-right ribbon overlay on the cover with green background and white foreground text ("READING"). Clicking those books opens the reader view directly and restores the user to the correct reading position (scroll/progress anchor). Books not in reading state continue to open the details/info page.

## Definition of Success

Users can quickly identify every in-progress book from the books list and can resume those books from one click with position restoration that matches last known progress.

## Additional Context

Operator request: "Join the list of books with the reading indicator so to show the 'reading' band as cover overlay" and "For the books that are currently 'reading' the click on the book cover from the list of books takes the user directly to the page reader and correct scroll."

## Assumptions

- A persisted reading progress signal already exists or can be derived for each book.
- Reader routing supports deep-link or progress-based resume behavior.
- "Correct scroll" means restoring to the most recent saved position for the current user and book.

## Constraints

- Preserve existing books list layout quality and cover rendering behavior.
- Keep behavior scoped to books marked as currently "reading".
- Keep non-reading book cover click behavior on details/info navigation.
- Avoid regressions for books not in reading state.

## Acceptance Criteria

- Books in "reading" state display a visible "reading" band overlay on their cover card in the books list.
- Clicking a reading-state cover navigates directly to the reader page for that same book.
- The reader opens at the correct saved reading position for that user/book when progress is valid.
- If scroll/progress is corrupted but target page/chapter is available, open that page/chapter anyway.
- If page/chapter target is not available, fall back to opening the book details/info page.
- Non-reading books open the details/info page.

## Dos

- Reuse existing reading-progress and reader-resume mechanisms where possible.
- Keep styling consistent with current LingoCafe visual language.
- Validate interaction flow from books list to reader resume.

## Don'ts

- Do not redesign the entire books card system for this task.
- Do not change unrelated reader features.
- Do not introduce multi-step resume flows for books already marked as reading.

## Open Questions

- n/a

## Related to

- [PR58: Show "Read now" or "Continue reading" on Book Details](../../completed/PR58-show-read-now-or-continue-reading-on-book-details/PR58.task.md)
- [XI31: Fix reader scroll position progress](../../completed/XI31-fix-reader-scroll-position-progress/XI31.task.md)
- [IL68: Open book info page from books list](../../completed/IL68-open-book-info-page-from-books-list/IL68.task.md)
- [WO85: Improve LingoCafe book card image-first design](../../completed/WO85-improve-lingocafe-book-card-image-first-design/WO85.task.md)
