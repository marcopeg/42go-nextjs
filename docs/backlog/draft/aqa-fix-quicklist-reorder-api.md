# Fix QuickList reorder API [aqa]

The QuickList reorder API is currently misbehaving:

- reorder items on mobile
- click on refresh

Often after refreshing the list the items appear in a different order compared to the drag'n'drop visual result before hitting refresh

## Root Cause Analysis

**Current Implementation Problems:**

1. **Individual PATCH per drag**: `handleDragEnd` makes a single PATCH call with just the new position
2. **Complex position recomputation**: API route tries to recalculate all positions during transaction
3. **Race conditions**: Multiple drags in quick succession can cause conflicts
4. **No validation**: Current positions can get out of sync with visual order

**Proposed Solution:**

Create a new bulk reorder endpoint: `POST /api/quicklists/[projectId]/reorder`

- Accept array of task IDs in desired order
- Update all positions in single transaction
- Return updated task list

## Development Plan

### 1. Create Bulk Reorder API Endpoint

**File**: `/src/app/api/quicklists/[projectId]/reorder/route.ts` (new)

**Implementation**:

- Accept `POST` with body: `{ taskIds: string[] }`
- Validate all taskIds belong to the project and user has access
- Update positions atomically: each taskId gets position = array index + 1
- Return success with updated tasks

**Schema validation**:

```typescript
const bodySchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
});
```

**SQL Approach**: Use transaction with individual updates (simpler, good enough for typical list sizes <100 items).

### 2. Update Frontend to Use Bulk Reorder

**File**: `/src/app/(app)/quicklists/[id]/page.tsx`

**Changes in `handleDragEnd`** (lines 369-395):

- Remove individual PATCH call
- After `arrayMove`, collect all pending task IDs in order
- Call new `/reorder` endpoint with full ID array
- On success, keep optimistic update
- On failure, refetch to restore correct state

### 3. Simplify Individual Task Update API

**File**: `/src/app/api/quicklists/[projectId]/[taskId]/route.ts`

**Changes in PATCH handler** (lines 136-151):

- Remove `positionChanged` logic and position recomputation
- Keep only title and completed updates
- Position updates should go through new bulk endpoint only

### 4. Update Hook to Support Bulk Reorder

**File**: `/src/lib/quicklists/hooks/useQuicklistData.ts`

**Add new method**:

```typescript
handleReorderTasks: (taskIds: string[]) => Promise<void>;
```

### 5. Clean Up Legacy Position Update Code

**Files to review**:

- Remove or deprecate position parameter from individual task PATCH
- Update TypeScript types to reflect position is not updatable individually

## Performance Considerations

**UUID Array Size**: For a list of 100 items, the payload would be ~3.6KB (36 bytes per UUID). This is acceptable.

**Database Load**: A single transaction with 100 UPDATE statements is fine for PostgreSQL. Could optimize later with CASE statement if needed.

**Recommendation**: Start with simple approach (loop updates in transaction). Optimize only if performance issues arise.

## Acceptance Criteria

- [ ] Consistent "reorder -> refresh" final order result
- [ ] Clean up existing order-related API and frontend calls
- [ ] Single API call after drag-and-drop
- [ ] Atomic position updates in transaction
- [ ] Error handling with fallback to refetch

## Next Steps

execute task (k3)
