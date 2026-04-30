---
taskId: AQD
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Animate check item as slide-away to right [aqd]

Improve UX by animating a checked item with a smooth "slide-away to the right" animation when marking as completed. The animation should feel instant and satisfying with zero perceived delay, giving visual feedback that the task is being completed.

## Context

**Current Implementation**:

- QuickList tasks use `movingDownIds` state to trigger a 600ms fade animation when checking items
- The `TaskItem` component receives a `movingDown` prop that applies `transition-all duration-500 ease-out opacity-70`
- Tasks move from pending to completed section with only opacity fade, no height collapse
- Backend API call happens immediately but UI waits for response (not optimistic enough)
- Implementation in: `src/lib/quicklists/components/TaskItem.tsx` and `src/lib/quicklists/hooks/useQuicklistData.ts`

**Technology Stack**:

- Tailwind CSS for styling
- dnd-kit for drag-and-drop (already integrated)
- React state management with optimistic updates
- No animation library currently in use

## Desired Behavior (User Experience)

The complete workflow when a user clicks on an open task:

1. **User clicks checkbox on open task** → check mark appears instantly
2. **Backend status update starts immediately** → API call fires but is NOT awaited (fire-and-forget pattern)
3. **Slide-away animation starts immediately** → task slides to the right while fading out (NO delay, NO waiting for backend)
   - The goal is to let the user FEEL that the task is getting completed
   - Visual feedback: "I'm marking this as done, it's moving away"
4. **Task appears in completed section** → appears at top of completed list with a simple fade-in animation
5. **Backend sync completes** → happens asynchronously in background
6. **Error handling** → if backend fails, show toast notification and refresh list to restore correct state

**Key principle**: Animation starts IMMEDIATELY on click. Backend response is irrelevant to animation timing. The slide-away motion provides clear visual feedback of the state transition.

## Goals

- [ ] Implement slide-away-to-right animation (translateX + opacity + height collapse) that starts instantly on click
- [ ] Ensure animation performs smoothly without layout jank
- [ ] Make backend API call truly fire-and-forget (don't block animation)
- [ ] Add fade-in animation when task appears in completed section
- [ ] Respect `prefers-reduced-motion` accessibility setting
- [ ] Maintain compatibility with dnd-kit drag-and-drop functionality
- [ ] Keep animation CSS-only for performance (no additional libraries)

## Acceptance Criteria

- [ ] Clicking checkbox triggers slide-away animation INSTANTLY (no perceived delay)
- [ ] Slide-away animation: slides to the right (translateX) + opacity fade + height collapse
- [ ] Animation duration 400-500ms (feels snappy, not sluggish)
- [ ] Backend API fires immediately but doesn't block UI (fire-and-forget)
- [ ] Task appears at top of completed list with fade-in animation as slide-away completes
- [ ] On backend error: toast notification + list refresh to restore state
- [ ] Animation respects `prefers-reduced-motion` media query (instant or reduced animation)
- [ ] Unchecking items works smoothly (no slide-away animation needed on uncheck)
- [ ] No layout shift or jank during animation on long lists
- [ ] Drag-and-drop functionality remains unaffected
- [ ] Manual QA verification on both mobile and desktop

## Development Plan

### 1. Research & Choose Animation Approach

**Animation Requirements**:

- **Slide to right**: `translateX(100%)` or `translateX(300px)`
- **Fade out**: `opacity: 1` → `opacity: 0`
- **Collapse height**: `max-height` → `0` (to remove space)

**Chosen Approach**: Combined CSS transitions on `transform`, `opacity`, and `max-height`

**Why this approach**:

- `transform: translateX()` is GPU-accelerated (smooth performance)
- Combined with `opacity` fade for polished look
- `max-height` removes the space after slide-away completes
- Single CSS transition, no JavaScript animation loops
- Works well with dnd-kit's transform system

**Animation Sequence**:

Improve UX by letting a checked QuickList item slide-and-collapse on completion **without** being yanked into the completed block before the animation plays out.

## Context

- We already tried shipping this twice; each time the `tasks` array updated immediately, so the item jumped to the completed block and the animation never showed.
- `useQuicklistData` currently toggles completion optimistically and pushes the task into the completed list right away.
- `TaskItem` only knows whether it is in the `movingDownIds` set and cannot own the transition lifecycle.
- Drag-and-drop (dnd-kit) and Tailwind-powered styling are already in place; no extra animation library exists today.

## Desired Behavior

1. User clicks the checkbox on an **open** task.
2. `TaskItem` flips into a local "completing" phase that drives a slide-right + fade + collapse animation while the task **stays** in the open list.
3. The network request fires immediately (fire-and-forget). We do not wait for it to settle before animating.
4. When the animation ends, `TaskItem` notifies the list/hook to commit the actual state change so the task moves into the completed bucket and fades in there.
5. If the request eventually fails, we toast, refresh the list, and reset the local phase.

## Goals

- [ ] Introduce a per-item transient state (`idle → completing → committed`) so the animation can run before the list mutates.
- [ ] Delay mutating the shared tasks collection until the item reports its animation completion.
- [ ] Keep the backend call independent: fire immediately, never await, handle errors with a toast + refresh.
- [ ] Preserve DnD behaviour and prevent other tasks from reordering while one is in the "completing" phase.
- [ ] Respect `prefers-reduced-motion` by short-circuiting to an instant commit when motion is disabled.
- [ ] Keep the solution CSS-driven and performant on long lists.

## Acceptance Criteria

- [ ] Checking an open item triggers the slide-right/fade/collapse animation **without** moving the item to the completed block until the animation finishes.
- [ ] On animation end, the list updates exactly once and the task lands at the top of the completed block with a quick fade-in.
- [ ] The network request fires right after the click, isn’t awaited, and failures surface via toast + list refresh.
- [ ] Rapid clicks on different tasks queue independent animations without race conditions or duplicated commits.
- [ ] Unchecking a completed item still works instantly (no slide animation on the way back).
- [ ] Reduced-motion users get an immediate state flip with no animation classes applied.
- [ ] DnD interactions remain stable; no runaway transforms when an item is mid-animation.

## Development Plan

### 1. Map the current toggle flow

- Trace `handleToggleTask` in `src/lib/quicklists/hooks/useQuicklistData.ts` and how `TasksList`/`TaskItem` consume `movingDownIds`.
- Document where the state mutation happens so we know exactly what to defer.

### 2. Design the transition state contract

- Add a lightweight state machine to `TaskItem` (`idle`, `completing`, maybe `rollback`).
- Extend the hook to expose callbacks like `requestToggle(taskId, nextStatus)` and `commitToggle(taskId)`.
- Store pending intent in the hook (e.g., `pendingStatusChanges: Map<string, "completed" | "open">`) without touching the main `tasks` array yet.

### 3. Trigger animation without list mutation

- In `TaskItem`, when an open item is toggled:
  - set local phase to `completing`.
  - call `requestToggle` so the hook can fire the network request and remember the intent.
  - apply CSS classes (translate + opacity + height collapse) keyed off the local phase.
- Attach `onTransitionEnd`/`onAnimationEnd` (with a timeout fallback) to call `commitToggle` once the slide-out finishes.

### 4. Commit the shared state after animation

- `commitToggle` mutates the canonical `tasks` array, moving the item into the completed block and clearing any pending intent.
- Protect against double commits (ignore if a commit already happened or if the user reversed the action mid-animation).
- When reduced-motion is active, skip straight to `commitToggle`.

### 5. Handle backend lifecycle and errors

- Fire the PATCH request inside `requestToggle` immediately, don’t await.
- On rejection, toast + `refetch()` the list, and tell any affected item to reset to `idle`.
- Consider cancelling pending timers when a failure occurs to avoid stale commits.

### 6. Refresh completed-section animation

- Keep (or add) a simple fade-in on the completed block using an ephemeral `newlyCompletedIds` set, cleared shortly after commit.
- Ensure the fade-in only runs after the deferred commit so nothing flickers twice.

### 7. Accessibility and DnD review

- Wrap transitions with `motion-reduce:transition-none` to guarantee instant updates when required.
- Verify dnd-kit still owns transforms when an item is draggable; if necessary, suppress drag handles while an item is `completing`.

## QA Strategy

- Toggle a single item: confirm it slides away in place, then appears completed after the animation.
- Spam-toggle multiple items rapidly: ensure each animates independently and commits in order.
- Simulate offline/500 responses: animation still plays, toast fires, list refreshes back to the original state.
- Toggle with `prefers-reduced-motion` enabled: state flips instantly with no animation.
- Uncheck a completed task: it should return to the open block immediately (same behaviour as today).
- Drag another task while one is completing to confirm no transform glitches.
- Smoke-test on mobile and desktop breakpoints.

## Risks & Open Questions

- What happens if the user clicks the same checkbox again before the first animation finishes? We may need to queue or cancel.
- Do we want a visual indicator while waiting for the backend error toast (e.g., disable checkbox)?
- Should we guard against multiple concurrent network requests for the same task?

## Progress

- Introduced deferred completion mechanism in `useQuicklistData` (`completionPhase`, `pendingCompletions`, `requestComplete`, `commitCompletion`).
- Converted server toggle to fire-and-forget; UI no longer awaits the PATCH.
- Added `completionPhase` propagation through `TasksList` → `TaskItem`.
- Implemented slide-away + collapse CSS transition in `TaskItem` with `onTransitionEnd` commit.
- Removed immediate optimistic completed mutation; commit happens only after animation.

## Issues Encountered

- Legacy `movingDownIds` still present; kept for backward safety but no longer central to completion animation. Candidate for removal after verification.
- Need a fade-in class for completed items (future polish) – currently not re-added; deferred.

## Next Steps

- Run QA (visual verification) and add optional fade-in for completed appearance.
- Remove `movingDownIds` once confirmed unused for new flow.
- Add reduced-motion branch test.

### Phase 4: Connect Everything in Parent Component

**Files**:

- `src/lib/quicklists/hooks/useQuicklistData.ts` (return statement)
- Parent component using the hook (likely in `src/app/*/quicklists/[id]/page.tsx`)

**Changes Required**:

1. **Export `newlyCompletedIds`** from hook (around line 295-303):

   ```typescript
   return {
     // ... existing returns
     movingDownIds,
     newlyCompletedIds, // ADD THIS
     setMovingDownIds,
     setNewlyCompletedIds, // ADD THIS (optional, for manual control)
     // ... rest
   };
   ```

2. **Pass to TasksList components** in parent page:
   ```tsx
   <TasksList
     // ... existing props
     movingDownIds={movingDownIds}
     newlyCompletedIds={newlyCompletedIds}
   />
   ```

**Expected Outcome**: Full animation flow connected from hook → list → item.

---

### Phase 5: Testing & QA

**Pre-flight checks**:

1. Run `make qa` to verify no linting/build errors
2. Start dev server with `make app`
3. Navigate to `/quicklists/[any-id]`

**Test Scenarios** (follow exact steps from section 7 in Development Plan):

- ✅ Happy path: check task → slide-away → fade-in
- ✅ Uncheck: instant move back
- ✅ Rapid checking: multiple tasks
- ✅ Error handling: offline mode
- ✅ Accessibility: reduced motion
- ✅ Mobile & desktop viewports
- ✅ Performance: 50+ tasks

**Browser DevTools Tips**:

- Network tab → Offline to test error handling
- Accessibility → Emulate reduced motion
- Performance tab → record animation smoothness

---

## Implementation Order

1. ✅ **Hook changes** (Phase 1) - Foundation for fire-and-forget
2. ✅ **TaskItem slide-away** (Phase 2) - Core animation
3. ✅ **Tailwind config** (Phase 3.7) - Enable fade-in animation
4. ✅ **TasksList props** (Phase 3.1-3.3) - Wire up newly completed tracking
5. ✅ **TaskItem fade-in** (Phase 3.4-3.6) - Complete animation system
6. ✅ **Parent wiring** (Phase 4) - Connect all pieces
7. ✅ **QA testing** (Phase 5) - Verify all scenarios

**Estimated Time**: 45-60 minutes for implementation + 30 minutes for thorough QA

---

## Success Criteria Checklist

Before marking task complete:

- [ ] Slide-away animation triggers instantly on checkbox click (no delay)
- [ ] Task slides to right while fading and collapsing height
- [ ] Backend call fires immediately but doesn't block UI
- [ ] Newly completed tasks fade in smoothly
- [ ] Error handling works (offline mode test)
- [ ] Reduced motion accessibility works (instant updates)
- [ ] Drag-and-drop still functions correctly
- [ ] No console errors or warnings
- [ ] `make qa` passes with no errors

## Next Steps

**Execute Task (k3)** → Implement following the phases above in order
