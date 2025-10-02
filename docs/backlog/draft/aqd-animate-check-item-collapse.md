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

1. **0ms**: Checkbox click → set `movingDown` state
2. **0-400ms**: Slide right (`translateX(100%)`) + fade out (`opacity: 0`)
3. **300-400ms**: Height collapses (`max-height: 0`) starts slightly delayed for smoother feel
4. **400ms**: Task appears in completed section with fade-in
5. **500ms**: Clear `movingDown` state

### 2. Refactor Backend Call Timing (Fire-and-Forget)

**File**: `src/lib/quicklists/hooks/useQuicklistData.ts`

**Current behavior** (lines 94-145):

- Sets `movingDownIds` state
- Updates local state optimistically
- Awaits backend response
- Handles errors by reverting state

**Changes needed**:

1. Keep optimistic state update (immediate)
2. Keep animation trigger (immediate)
3. Fire backend API call without awaiting (background)
4. On error: show toast + call `refreshData()` to reload list
5. Remove rollback logic (refresh handles it)

**New flow**:

```typescript
// Immediate optimistic update
setMovingDownIds((prev) => new Set(prev).add(taskId));
setTasks((prev) => prev.map(...)); // optimistic

// Fire backend call (don't await)
fetch(...).catch(() => {
  toast({ variant: "destructive", title: "Failed to update task" });
  refreshData(); // Simple reload
});

// Clear animation state after animation completes
setTimeout(() => setMovingDownIds(...), 500);
```

### 3. Update TaskItem Component (Slide-Away Animation)

**File**: `src/lib/quicklists/components/TaskItem.tsx`

**Changes**:

1. Add slide-away animation when `movingDown` is true
2. Animation properties:
   - **translateX**: `0` → `100%` (or `300px` for consistent distance)
   - **opacity**: `1` → `0`
   - **max-height**: `200px` → `0` (with slight delay for smoother feel)
   - **padding/margin**: collapse to `0`
3. Transition timings:
   - `transform, opacity`: 400ms ease-out
   - `max-height, padding, margin`: 400ms ease-out (start at 100ms for staggered effect)
4. Add `overflow: hidden` to container
5. Add `motion-reduce:` prefix for accessibility

**CSS approach**:

```tsx
<li className={`
  transition-[transform,opacity,max-height,padding,margin]
  duration-[400ms,400ms,400ms,400ms,400ms]
  ease-out
  motion-reduce:transition-none
  motion-reduce:duration-0
  ${movingDown
    ? 'translate-x-full opacity-0 max-h-0 py-0 my-0'
    : 'translate-x-0 opacity-100 max-h-[200px]'
  }
  overflow-hidden
`}>
```

**Alternative with fixed distance** (more controlled on wide screens):

```tsx
${movingDown
  ? 'translate-x-[300px] opacity-0 max-h-0 py-0 my-0'
  : 'translate-x-0 opacity-100 max-h-[200px]'
}
```

**Note**: Use `translate-x-full` for percentage-based (slides out completely regardless of screen width) or fixed pixel value like `300px` for consistent feel. Test both and choose based on visual preference.

### 4. Add Fade-In Animation for Completed Section

**File**: `src/lib/quicklists/components/TasksList.tsx` or where completed tasks render

**Goal**: When a task appears in the completed section, it should fade in smoothly.

**Approach**:

- Add a new state to track newly completed task IDs
- Apply fade-in animation class for a brief period (500ms)
- Use CSS animation or transition

**CSS approach**:

```tsx
// Add to newly completed task items
className={`
  ${isNewlyCompleted
    ? 'animate-in fade-in duration-500'
    : ''
  }
`}
```

**Alternative with Tailwind**:

```tsx
${isNewlyCompleted
  ? 'opacity-0 animate-[fadeIn_500ms_ease-in_forwards]'
  : ''
}

// In tailwind.config.js, add:
keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  }
}
```

**State management**:

- Track `newlyCompletedIds` Set in parent component
- Add ID when task completes
- Remove ID after 500ms timeout
- Pass as prop to completed section

### 5. Add Accessibility Support

**File**: `tailwind.config.js`

- Verify `motion-reduce:` variant is enabled (should be by default)
- Test behavior with `prefers-reduced-motion: reduce`

**Behavior with reduced motion**:

- Slide-away animation: instant (no transition)
- Fade-in animation: instant (no transition)
- Checkbox state change: immediate
- Both animations use `motion-reduce:transition-none` and `motion-reduce:duration-0`

### 6. Error Handling Update

**File**: `src/lib/quicklists/hooks/useQuicklistData.ts`

Replace complex rollback logic with simple refresh:

- Show error toast
- Call `refreshData()` to reload from server
- User sees task return to correct state smoothly

### 7. Testing Strategy

**Manual QA Steps**:

1. **Happy path - Slide away animation**:

   - Click checkbox on open task → checkmark appears instantly
   - Task slides to the right while fading out (smooth, no jank)
   - Task disappears completely after 400-500ms
   - Task appears at top of completed section with fade-in
   - No perceived delay between click and animation start

2. **Uncheck task**:

   - Click checkbox on completed task
   - Task instantly moves back to pending (no slide animation on uncheck)

3. **Rapid checking**:

   - Check multiple tasks quickly in succession
   - Verify animations don't conflict or overlap badly
   - Each task slides away independently

4. **Error simulation**:

   - Use DevTools Network tab → Offline mode or throttle to "Slow 3G"
   - Check a task → slide-away animation should still happen instantly
   - Verify toast appears after backend fails
   - Verify list refreshes to restore correct state

5. **Accessibility - Reduced motion**:

   - Enable "Reduce Motion" in system preferences
   - Check task → should update state instantly (no slide animation)
   - Task appears in completed section instantly (no fade-in)

6. **Mobile & Desktop**:

   - Test slide-away animation on mobile viewport (< 768px)
   - Test slide-away animation on desktop viewport (>= 768px)
   - Verify drag-and-drop still works on both (no animation conflicts)

7. **Performance with many tasks**:
   - Create 50+ tasks
   - Check multiple items rapidly
   - Verify smooth animations, no lag or frame drops

**Test URL**: `/quicklists/[id]` (any existing list with tasks)

**Browser Testing**:

- Chrome DevTools: Network throttling + offline mode
- Firefox: `about:config` → `ui.prefersReducedMotion = 1`
- Safari: System Preferences → Accessibility → Reduce Motion

### 8. Performance Considerations

- Use CSS transitions only (no JS animation loops)
- `transform: translateX()` is GPU-accelerated (very performant)
- Combined with `opacity` transition (also GPU-accelerated)
- `max-height` transition for space removal (acceptable performance)
- Avoid `will-change` unless needed (adds memory overhead)
- Test with 50+ tasks to ensure smooth performance
- Stagger timing slightly (slide first, then collapse) for polished feel

## Implementation Notes

### Current Animation Hook (`useQuicklistData.ts` lines 94-145)

**Problem**: Current implementation waits for backend response before completing animation flow.

**Solution**: True optimistic update pattern:

```typescript
const handleToggleTask = async (taskId: string, completed: boolean) => {
  const originalTask = tasks.find((t) => t.id === taskId);
  if (!originalTask) return;

  const now = new Date().toISOString();

  // 1. START ANIMATION IMMEDIATELY (no delays)
  if (completed) {
    setMovingDownIds((prev) => new Set(prev).add(taskId));
  }

  // 2. OPTIMISTIC STATE UPDATE (immediate)
  setTasks((prev) =>
    prev.map((t) =>
      t.id === taskId
        ? { ...t, completed_at: completed ? now : null, updated_at: now }
        : t
    )
  );

  // 3. FIRE BACKEND CALL (don't await, fire-and-forget)
  fetch(`/api/quicklists/${projectId}/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ completed }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    })
    .catch((error) => {
      // Simple error handling: notify + refresh
      toast({
        variant: "destructive",
        title: "Failed to update task",
        description: "Refreshing list...",
      });
      refreshData(); // Reload from server
    });

  // 4. CLEAR ANIMATION STATE (after animation completes)
  if (completed) {
    setTimeout(() => {
      setMovingDownIds((prev) => {
        const n = new Set(prev);
        n.delete(taskId);
        return n;
      });
    }, 500); // Match animation duration
  }
};
```

### TaskItem Animation Pattern

**Key change**: Apply slide-away animation to the `<li>` element:

```tsx
<li
  className={`
    transition-[transform,opacity,max-height,padding,margin]
    duration-[400ms,400ms,400ms,400ms,400ms]
    ease-out
    motion-reduce:transition-none
    motion-reduce:duration-0
    ${
      movingDown
        ? "translate-x-full opacity-0 max-h-0 py-0 my-0"
        : "translate-x-0 opacity-100 max-h-[200px] py-3"
    }
    overflow-hidden
  `}
>
  {/* Existing task content */}
</li>
```

**Alternative with fixed distance** (may feel more controlled):

```tsx
${
  movingDown
    ? "translate-x-[300px] opacity-0 max-h-0 py-0 my-0"
    : "translate-x-0 opacity-100 max-h-[200px] py-3"
}
```

**Animation sequence**:

1. **0-400ms**: Slide right (`translateX`) + fade out (`opacity`)
2. **0-400ms**: Height collapses (`max-height: 0`)
3. Result: Task slides away to the right while fading and collapsing

**Why max-height: 200px?** Safely accommodates any task height (even multi-line titles + completed timestamp).

**Why translateX(100%)?** Slides completely off screen regardless of viewport width. Alternative: use fixed pixel value like `300px` for consistent slide distance.

### Completed Section Fade-In Pattern

**Goal**: When a task appears in the completed section, it should fade in smoothly.

**Implementation approach**:

1. **Track newly completed tasks**: Add `newlyCompletedIds` state in parent component
2. **Set timeout**: When task completes, add to set and clear after 500ms
3. **Apply animation**: Pass prop to completed section

```tsx
// In parent component (useQuicklistData or TasksList)
const [newlyCompletedIds, setNewlyCompletedIds] = useState<Set<string>>(new Set());

const handleToggleTask = (taskId: string, completed: boolean) => {
  // ... existing logic ...

  if (completed) {
    // Add to newly completed set
    setNewlyCompletedIds((prev) => new Set(prev).add(taskId));

    // Clear after fade-in animation completes
    setTimeout(() => {
      setNewlyCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 500);
  }
};

// In TaskItem for completed section
<li className={`
  ${isNewlyCompleted
    ? 'animate-in fade-in duration-500'
    : ''
  }
`}>
```

**Tailwind config** (if `animate-in` utility not available):

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fadeIn 500ms ease-in forwards",
      },
    },
  },
};
```

## Implementation Summary

This section will be updated as the task progresses.

### ✅ Changes To Be Completed

**1. Backend Hook Refactor** (`src/lib/quicklists/hooks/useQuicklistData.ts`)

- Convert `handleToggleTask` to fire-and-forget pattern
- Animation triggers IMMEDIATELY on click (no waiting for backend)
- Backend API call runs asynchronously
- Error handling: Toast notification + `refreshData()` to restore state
- Add `newlyCompletedIds` state management for fade-in tracking

**2. TaskItem Slide-Away Animation** (`src/lib/quicklists/components/TaskItem.tsx`)

- Add slide-away animation using `transform: translateX()` + `opacity` + `max-height`
- When `movingDown` is true:
  - Slide right: `translate-x-full` or `translate-x-[300px]`
  - Fade out: `opacity-0`
  - Collapse: `max-h-0 !py-0 !my-0`
- Transition: `transform, opacity, max-height` over 400ms
- Add `motion-reduce:transition-none` for accessibility
- Normal state: `translate-x-0 opacity-100 max-h-[200px]`

**3. Completed Section Fade-In** (`src/lib/quicklists/components/TasksList.tsx`)

- Track `newlyCompletedIds` in state
- Add task ID when completing, remove after 500ms
- Apply fade-in animation class to newly completed tasks
- Use Tailwind's `animate-in fade-in` or custom keyframe animation

**4. Accessibility Support**

- Verify `motion-reduce:` variants work correctly
- Test with system "Reduce Motion" enabled
- Ensure instant state changes when animations disabled

### Key Implementation Details

**Fire-and-Forget Pattern**:

```typescript
// Animation starts immediately
if (completed) {
  setMovingDownIds((prev) => new Set(prev).add(taskId));
  setNewlyCompletedIds((prev) => new Set(prev).add(taskId));

  setTimeout(() => {
    setMovingDownIds((prev) => { /* clear */ });
  }, 500);

  setTimeout(() => {
    setNewlyCompletedIds((prev) => { /* clear */ });
  }, 500);
}

// Optimistic update
setTasks((prev) => prev.map(...));

// Fire backend call (don't await)
fetch(...).then(...).catch(() => {
  toast({ title: "Failed to update task" });
  refreshData();
});
```

**Slide-Away CSS**:

```tsx
className={`
  transition-[transform,opacity,max-height,padding,margin]
  duration-[400ms]
  ease-out
  overflow-hidden
  motion-reduce:transition-none
  ${movingDown
    ? 'translate-x-full opacity-0 max-h-0 !py-0 !my-0'
    : 'translate-x-0 opacity-100 max-h-[200px] py-3'
  }
`}
```

**Fade-In CSS** (for completed section):

```tsx
className={`
  ${isNewlyCompleted
    ? 'animate-in fade-in duration-500'
    : ''
  }
`}
```

### Manual QA Required

**Next Steps**: Run the app and verify:

1. **Happy path**:

   - Click checkbox → checkmark appears instantly
   - Task collapses smoothly (height shrinks + opacity fades)
   - Task appears at top of completed section
   - No perceived delay

2. **Uncheck task**:

   - Task instantly moves back to pending (no animation)

3. **Rapid checking**:

   - Check multiple tasks quickly
   - Verify no animation conflicts or jank

4. **Error simulation**:

   - Use DevTools Network tab → Offline mode
   - Check a task → verify toast appears
   - Verify list refreshes to restore state

5. **Accessibility**:

   - Enable "Reduce Motion" in system preferences
   - Check task → should collapse instantly (no animation)

6. **Mobile & Desktop**:

   - Test on mobile viewport (< 768px)
   - Test on desktop viewport (>= 768px)
   - Verify drag-and-drop still works

7. **Performance**:
   - Create 50+ tasks
   - Check multiple items rapidly
   - Verify smooth animations, no lag

**Test URL**: `/quicklists/[id]` (any existing list with tasks)

## Resources

- Tailwind CSS max-height: https://tailwindcss.com/docs/max-height
- MDN prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- CSS Transitions: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions/Using_CSS_transitions

## Next Steps

**Plan Task (k2)** → Review and plan the implementation with additional context from codebase
**Execute Task (k3)** → Implement the slide-away animation following the detailed plan above
