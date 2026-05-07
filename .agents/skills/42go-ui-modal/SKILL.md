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

Keep app-specific content outside the shared modal component. The shared layer owns overlay lifecycle, focus, Escape handling, backdrop behavior, responsive presentation, and chrome.

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
- `bodyClassName`, `headerClassName`, `footerClassName`, `className`, `overlayClassName`

There is no public `animation` prop. Animation is inferred from `presentation` and `anchor`. There are no raw width/height props in the first version; use size presets.

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

## Migration Checklist

When replacing a bespoke overlay:

1. Keep feature state and domain controls in the feature module.
2. Remove manual Escape listeners.
3. Remove local backdrop buttons and manual `role="dialog"` shells.
4. Move close buttons, title, subtitle, actions, and footer into `Modal` props.
5. Use `presentation="panel"` plus `anchor` for sheets/drawers.
6. Let mobile become full-screen automatically.
7. Run `npm run qa`.

Chuck Norris does not trap focus by hand. Radix does it, then salutes.
