# Custom Actions Type [adf]

## Situation

We have 2 components that implement the top/right actions for a given page:

- `@/42go/layouts/public/HeaderLinks.tsx` - accepts `ContentBlockItem[]` from server version
- `@/42go/layouts/app/AppHeader.tsx` - accepts `AppLayoutActionItem[]` (alias of client ContentBlockItem)

Right now both components accept the full `@/42go/components/ContentBlock` data type, but not all block types make sense in header/toolbar contexts. The server version includes hero, demo, markdown blocks while the client version is limited to link and component blocks.

**Current Inconsistencies:**

1. **Naming Convention**: "HeaderLinks" vs "headerActions" - mixed terminology
2. **Configuration API**: `AppConfig.public.toolbar.links` vs `headerActions` prop
3. **Component Structure**: Different concepts of "Header" vs "Toolbar"
4. **Type Safety**: Both use full ContentBlock types when only subset makes sense

**Current Content Block Types:**

- **Server**: `hero`, `demo`, `markdown`, `component`, `link` (5 types)
- **Client**: `component`, `link` (2 types)

**Current API Differences:**

- **Public Layout**: Configuration via `AppConfig.public.toolbar.links` (declarative, SSR-optimized)
- **App Layout**: Direct props via `headerActions` parameter (imperative, client-only)

## Goals

1. **Uniform Toolbar Concept**: Standardize both layouts to use "Toolbar" terminology with "actions" instead of mixed "Header/HeaderLinks/headerActions"

2. **Consistent API Naming**:

   - Rename `AppConfig.public.toolbar.links` → `AppConfig.public.toolbar.actions`
   - Rename `headerActions` prop → `actions` prop
   - Consider renaming/restructuring components for consistency

3. **Rendering Strategy Alignment**:

   - **PublicLayout**: Maintain full SSR compatibility and SEO optimization
   - **AppLayout**: Focus on zero SSR, entirely client-rendered for performance

4. **Type Safety**: Create specific `TActionItem` types for each layout that only include appropriate blocks (`link` and `component`)

## Acceptance Criteria

### Phase 1: Uniform Toolbar Concept

- [ ] Rename `AppConfig.public.toolbar.links` → `AppConfig.public.toolbar.actions`
- [ ] Rename `headerActions` prop → `actions` prop in AppLayout
- [ ] Update AppHeader component to use `actions` prop name
- [ ] Consider renaming HeaderLinks → ToolbarActions for consistency
- [ ] Update all references and imports across codebase

### Phase 2: Component Structure Review

- [ ] Analyze current Header vs Toolbar component organization
- [ ] Document recommended component structure for both layouts
- [ ] Identify any components that need renaming/restructuring
- [ ] Plan migration strategy for component reorganization

### Phase 3: Type Safety Implementation

- [ ] Create `TActionItem` type for PublicLayout (SSR-compatible)
- [ ] Create `TActionItem` type for AppLayout (client-only)
- [ ] Both types should only include `link` and `component` blocks
- [ ] Update component interfaces to use new action types
- [ ] Update AppConfig type definitions

### Phase 4: Rendering Strategy Validation

- [ ] Ensure PublicLayout toolbar maintains full SSR compatibility
- [ ] Ensure AppLayout toolbar is entirely client-rendered
- [ ] Document rendering strategy differences and rationale
- [ ] Test SEO optimization for PublicLayout actions

### Phase 5: Migration & Documentation

- [ ] Ensure backward compatibility during transition
- [ ] Update documentation for new API patterns
- [ ] Provide migration guide for existing implementations
- [ ] Add TypeScript examples for both layout action patterns

# Custom Actions Type [adf] - SUPERSEDED

⚠️ **This task has been split into smaller, more manageable tasks:**

- [adg] Rename Toolbar API for Consistency
- [adh] Rename HeaderLinks to ToolbarActions
- [adi] Create PublicLayout TActionItem Type
- [adj] Create AppLayout TActionItem Type
- [adk] Document Toolbar Action Patterns

## Next Steps

Execute the split tasks in sequence: adg → adh → adi → adj → adk
