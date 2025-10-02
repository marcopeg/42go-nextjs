# Animate check item as visible collapse [aqd]

Improve UX by animating a checked item with a visible collapse animation rather than an abrupt hide. This will make completing tasks feel smoother.

## Goals

- Implement an animated collapse when items are checked/unchecked
- Ensure animation performs well for long lists (use CSS transitions or FLIP technique)
- Keep accessibility in mind (prefers-reduced-motion)
- Add tests or visual regression checks if possible

## Acceptance Criteria

- [ ] Checked items collapse with animation instead of instantly disappearing
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Works smoothly with virtualization or long lists
- [ ] Tests or manual verification steps documented

## Development Plan

1. Identify the task list UI component and item markup
2. Add CSS/JS to animate height/opacity (or use a small animation library)
3. Ensure removal from DOM happens after animation completes
4. Add unit/visual tests and document manual QA steps

## Notes

- Prefer CSS-only solution where possible for performance.
