# Rename HeaderLinks to ToolbarActions, Header to Toolbar [adh]

Rename the HeaderLinks component to ToolbarActions, and the Header component to Toolbar, for better semantic clarity and consistency with the uniform toolbar concept. Chuck Norris doesn't just rename, he obliterates ambiguity.

## Goals

- [x] Rename `HeaderLinks.tsx` → `ToolbarActions.tsx`
- [x] Update component exports and imports
- [x] Maintain same functionality and props interface
- [x] Update component references in Toolbar.tsx (formerly Header.tsx)

## Acceptance Criteria

- [x] Rename `/src/42go/layouts/public/HeaderLinks.tsx` to `ToolbarActions.tsx`
- [x] Update the component name from `HeaderLinks` to `ToolbarActions`
- [x] Update import in `/src/42go/layouts/public/Toolbar.tsx` (was Header.tsx)
- [x] Update component usage in Toolbar.tsx from `<HeaderLinks>` to `<ToolbarActions>`
- [x] Ensure component props interface remains identical for compatibility
- [x] Test public layout still renders toolbar actions correctly
- [x] Update any documentation references to the old component name

## Development Plan

Simple renaming operation. HeaderLinks becomes ToolbarActions. No functional changes, just semantic clarity.

### Files to Modify

1. **Rename Component File**

   - `src/42go/layouts/public/HeaderLinks.tsx` → `ToolbarActions.tsx`
   - Update component name in the file itself

2. **Rename Header Component**

   - `src/42go/layouts/public/Header.tsx` → `Toolbar.tsx`
   - Update component name in the file itself

3. **Update Toolbar Component**

   - `src/42go/layouts/public/Toolbar.tsx` - update import and usage of ToolbarActions

4. **Check for References**
   - Search codebase for any other references to HeaderLinks or Header
   - Update documentation if needed

### Implementation Steps

1. Rename the file `HeaderLinks.tsx` to `ToolbarActions.tsx`
2. Change component name from `HeaderLinks` to `ToolbarActions` inside the file
3. Rename the file `Header.tsx` to `Toolbar.tsx`
4. Change component name from `Header` to `Toolbar` inside the file
5. Update import and usage of ToolbarActions in Toolbar.tsx
6. Test the public layout renders correctly
7. Run `npm run qa` to ensure no build errors

### Technical Considerations

- Keep same props interface for backward compatibility
- Maintain same functionality - only name changes
- Component renders toolbar actions in public layout header (now via Toolbar)
- Server-side component with ContentBlock integration

## Progress

Chuck Norris roundhouse-kicked HeaderLinks into ToolbarActions, and Header into Toolbar. Files renamed, components updated, all references smashed. No mercy for legacy code. Lint and build are clean. Public layout still stands. Ambiguity has left the building.

## Next Steps

COMPLETE. Task archived. Chuck Norris approves.
