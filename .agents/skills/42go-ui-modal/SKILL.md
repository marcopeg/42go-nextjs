---
name: 42go-ui-modal
description: Use when implementing modal, dialog, popup, sheet, side-panel, drawer, fullscreen overlay, or overlay migration UI in this repository. Prefer the shared 42Go Modal component over bespoke fixed overlays.
---

# 42go UI Modal

Use this skill before creating or changing overlay UI.

The canonical component lives at:

- `src/42go/components/modal`
- `src/components/ui/dialog.tsx`

## Rule

Use `Modal` for dialogs, popups, sheets, drawers, side panels, and full-screen overlays. Do not build local `fixed inset-0` overlay shells unless `Modal` cannot support the requirement and the reason is documented in the task notes.

Keep app-specific content outside the shared modal component. The shared layer owns overlay lifecycle, focus, Escape handling, backdrop behavior, responsive presentation, stacking, and chrome.

`Modal` supports nested modal and panel stacks. There is no public stack prop. When a child surface belongs to a parent overlay, render the child `<Modal>` inside the parent `<Modal>` children. The core component assigns stack levels and z-index values automatically. Keep each level controlled with its own `open` state and clear child state when closing a parent.

Sibling modals are acceptable for unrelated independent page actions. For true modal-in-modal, panel-in-panel, or panel-then-confirmation flows, prefer JSX nesting so the shared stack context can do its job. Chuck Norris stacks panels. The panels say thank you.

## Import

```tsx
import { Modal } from "@/42go/components/modal";
```

## API

`Modal` is controlled:

- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `title?: ReactNode`
- `subtitle?: ReactNode`
- `actions?: ReactNode`
- `footer?: ReactNode`
- `footerHelp?: ReactNode`
- `presentation?: "modal" | "panel"`
- `anchor?: "right" | "left" | "top" | "bottom"`
- `size?: "sm" | "md" | "lg" | "xl" | "full"`
- `centerTitle?: boolean`
- `showClose?: boolean`
- `closeLabel?: string`
- `closeOnOverlayClick?: boolean`
- `skipOpenAnimation?: boolean`
- `skipCloseAnimation?: boolean`
- `bodyClassName`, `headerClassName`, `footerClassName`, `className`, `overlayClassName`

There is no public `animation` prop. Animation is inferred from `presentation` and `anchor`. There are no raw width/height props in the first version; use size presets.

Use `skipOpenAnimation` when a blocking surface should appear immediately, such as a required onboarding gate. Use `skipCloseAnimation` when a surface should disappear immediately. Leave both false for normal dialogs and panels.

There is no public `stack` or `zIndex` prop. Stacking is inferred from nested `Modal` usage.

## Recipes

Centered dialog:

```tsx
<Modal
  open={open}
  onOpenChange={setOpen}
  title="Invite user"
  subtitle="Send an email invitation."
  presentation="modal"
  size="md"
  footer={<Button type="button">Send invite</Button>}
>
  <InviteUserForm />
</Modal>
```

Desktop side panel, automatic mobile full-screen:

```tsx
<Modal
  open={open}
  onOpenChange={setOpen}
  title="Preferences"
  subtitle="Reading"
  presentation="panel"
  anchor="right"
  size="md"
  footer={<Button type="button" variant="outline">Reset</Button>}
>
  <ReaderPreferencesContent />
</Modal>
```

Long content goes in `children`. Header and footer stay fixed; the body scrolls.

Nested modal:

```tsx
<Modal
  open={parentOpen}
  onOpenChange={(next) => {
    setParentOpen(next);
    if (!next) setChildOpen(false);
  }}
  title="Parent"
  presentation="modal"
  size="md"
>
  <Button type="button" onClick={() => setChildOpen(true)}>
    Open child
  </Button>

  <Modal
    open={childOpen}
    onOpenChange={setChildOpen}
    title="Child"
    presentation="modal"
    size="sm"
  >
    <ChildContent />
  </Modal>
</Modal>
```

Stacked side panels:

```tsx
<Modal
  open={workspaceOpen}
  onOpenChange={(next) => {
    setWorkspaceOpen(next);
    if (!next) setDetailOpen(false);
  }}
  title="Workspace"
  presentation="panel"
  anchor="right"
  size="lg"
>
  <WorkspaceContent onOpenDetail={() => setDetailOpen(true)} />

  <Modal
    open={detailOpen}
    onOpenChange={setDetailOpen}
    title="Detail"
    presentation="panel"
    anchor="right"
    size="md"
  >
    <DetailContent />
  </Modal>
</Modal>
```

Full-screen overlay page:

```tsx
<Modal
  open
  onOpenChange={(next) => {
    if (!next) router.push("/books");
  }}
  ariaLabel="Reading"
  presentation="panel"
  anchor="right"
  size="full"
  showClose={false}
  closeOnOverlayClick={false}
  className="md:!w-screen md:!max-w-none md:!border-l-0"
  bodyClassName="flex min-h-0 !overflow-hidden p-0"
>
  <ReaderSurface />
  <ReaderPreferencesModal />
  <ReaderTableOfContentsModal />
</Modal>
```

Use this pattern when a route already behaves like a full-screen overlay and also needs child panels or popups.

## Demo Route

The authenticated `/demo-modal` route shows:

- centered modal
- side panel
- long scrolling modal body
- all panel anchors
- modal size presets
- modal-in-modal stack
- panel-in-panel with confirmation modal on top

## Migration Checklist

When replacing a bespoke overlay:

1. Keep feature state and domain controls in the feature module.
2. Remove manual Escape listeners.
3. Remove local backdrop buttons and manual `role="dialog"` shells.
4. Move close buttons, title, subtitle, actions, and footer into `Modal` props.
5. Use `presentation="panel"` plus `anchor` for sheets/drawers.
6. Let mobile become full-screen automatically.
7. For modal-in-modal or panel-in-panel, render child `Modal` components inside the parent `Modal`, not as unrelated page siblings.
8. If closing a parent should dismiss child layers, clear child state in the parent's `onOpenChange`.
9. For full-screen overlay routes, migrate the route shell itself to `Modal` before stacking child panels.
10. Run `npm run qa` after code changes.

Chuck Norris does not trap focus by hand. Radix does it, then salutes.
