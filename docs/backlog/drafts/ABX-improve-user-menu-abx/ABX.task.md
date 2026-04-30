---
taskId: ABX
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Improve User Menu [abx]

Right now the PublicLayout renders toolbar actions via `ContentBlock` and includes a UserMenu component from `@/42go/auth/components/UserMenu` injected by `AppConfig` as a `component` action. There is no `Header.tsx`; the toolbar is `src/42go/layouts/public/Toolbar.tsx`.

First, the user's menu should be placed within the "layouts/public" folder because it is specific to this layout (exported wrapper that composes auth bits). The low-level auth-related piece can stay under `42go/auth/components` and be wrapped to align with PublicLayout config and behavior.

Second, it should either show a primary "Login" button if the user is not logged in, else it should should the user's avatar or a fallback generic user icon if the user is logged in.

**Anonymous params**

If the user is NOT logged in, the button should get configuration from:

```ts
const config = {
  app1: {
    public: {
      userMenu: {
        publicCta: {
          label: "Sign in",
          href: "/login",
          style: "primary", // that is default value and can be omitted
        },
      },
    },
  },
};
```

**Logged in params**

If the user is logged in, then we should render the avatar with a fallback on a generic user icon. That will trigger a popover with links:

```ts
const config = {
  app1: {
    public: {
      userMenu: {
        userCta: {
          title: "What to show on mouse hover", // optional
          label: "Dashboard", // optional
          style: "primary", // optional, defaults to "primary" if a label is provided
          href: "/dashboard", // optional, if provided it replaces the popover menu behavior and makes the "dropDown" configuration useless
        },
        dropDown: {
          event: "hover|click", // optional, default "hover"
          items: [
            {
              label: "Dashboard",
              href: "/dashboard",
              divider: true,
            },
            {
              label: "Logout",
              href: "/logout",
              style: "primary",
            },
          ],
        },
      },
    },
  },
};
```

**User call to action control:**

The attribute `userCta.event` is optional and defaults to "hover" and it is used as trigger for the popover menu. in mobile it is fixed to the touch event so this particular param has no effects on mobile.

The attribute `title` is what to show on mouse-hover on the cta. If empty/missing omit the behavior.

The attribute `label` is optional. If provided, render a button instead of the user's avatar. In this case the `style` is applied to the button and if an `href` is also provided, then it completely skips rendering the popover with the links and it behaves as a single button implementing the `href` pattern.

**Popover menu items:**

In this case the default visualization for the items is a text button that transition to an outline on mouse hover (or touch feedback on mobile).

the optional param `divider` will add an horizontal divider after that particular item.

on mobile, the entire menu should act as a slide-in full screen page that comes from the right side of the screen.

**Disabled**

`config.public.userMenu.disabled=true` will simply make any other configuration useless and hide the component altogether.

---

## Current Implementation (as of Aug 15, 2025)

- Public toolbar: `src/42go/layouts/public/Toolbar.tsx` renders `ToolbarActions` which uses `ContentBlock` to render a list of action items from `config.public.toolbar.actions`.
- User menu component exists at: `src/42go/auth/components/UserMenu.tsx` using shadcn `DropdownMenu`, shows avatar + Profile/Sign Out items, uses `config.auth.logout.url` for redirect.
- It’s injected into toolbar via `AppConfig` as a component block: see `src/AppConfig.ts` with `{ type: "component", component: UserMenu }` in some apps’ `public.toolbar.actions`.

Gaps vs desired behavior:

- No `config.public.userMenu` yet; behavior is not configurable per the schema above.
- No mobile full-screen slide-in menu for the user menu; current is a dropdown.
- No support for hover-triggered open; Radix Dropdown is click-only unless manually controlled.
- No public CTA shown when user is anonymous based on config.

## Goals

- Implement `config.public.userMenu` schema described above with sane defaults.
- Render a PublicLayout-friendly UserMenu that:
  - Anonymous: shows a primary "Sign in" (configurable) CTA.
  - Authenticated: shows avatar or fallback icon; opens a menu with configured items or, if `userCta.label+href` provided, acts as a single button.
  - Honors `disabled` to hide entirely.
  - Mobile: menu behaves as full-screen slide-in panel from the right.
  - Desktop: default trigger is hover (configurable to click); optional tooltip/title on hover.
- Keep existing `42go/auth/components/UserMenu` backward-compatible for other layouts; introduce a `layouts/public` wrapper that reads the new config and delegates.

## Proposed Design

1. Config surface

- Add `public.userMenu` to `TAppConfig` (non-breaking, optional). Implement defaults:
  - Default anonymous CTA: `label: "Sign in"`, `href: "/login"`, `style: "primary"`.
  - Default dropdown items (authed): Profile + Logout if not overridden.
  - Default `userCta.event = "hover"` on desktop; click on mobile regardless.
- If `public.userMenu.disabled === true`, omit rendering entirely.

2. Rendering strategy

- Create `src/42go/layouts/public/UserMenu/` with a wrapper component that:
  - Reads `config.public.userMenu` and session.
  - Anonymous: renders shadcn Button with variant mapped from `style` (primary -> default, outline -> outline, link -> link, etc.).
  - Authed:
    - If `userCta.label` provided:
      - If `href` provided: render Button link, no dropdown.
      - Else: render Button as trigger to dropdown (or navigate).
    - Else: render avatar trigger with dropdown.
  - Desktop: use Radix DropdownMenu with controlled `open` on hover if `event === "hover"` (manage `onMouseEnter`/`onMouseLeave` to set open state).
  - Mobile: on trigger, open a `Dialog` or `Sheet` that slides in full screen from right, listing `dropDown.items` with optional dividers.
  - Logout item uses existing `signOut` and redirects to `config.auth.logout.url || "/"`.

3. Integration

- In `AppConfig.ts`, replace direct component reference with the new PublicLayout wrapper component.
- Option A (recommended): keep UserMenu as a component action in `public.toolbar.actions` for composition with other actions. The wrapper will resolve config and session.
- Option B: extend `ToolbarActions` to render UserMenu automatically if `config.public.userMenu` exists; keep backward compatibility with component action. (We’ll implement Option A now; Option B can be a follow-up.)

4. Types and mapping

- Extend `TPublicLayoutToolbar` types if needed only to allow the UserMenu to keep being an action via component.
- Add `TUserMenuConfig` type in `src/42go/layouts/public/types.ts` or a dedicated types file.
- Style mapping: `style` -> shadcn Button variant mapping table:
  - primary -> default
  - secondary -> secondary
  - outline -> outline
  - ghost -> ghost
  - link -> link

## Files to Change / Add

- Add: `src/42go/layouts/public/UserMenu/index.ts` (export)
- Add: `src/42go/layouts/public/UserMenu/PublicUserMenu.tsx` (wrapper implementation)
- Update: `src/AppConfig.ts` to use the new PublicUserMenu component in toolbar actions and define optional `public.userMenu` examples for default apps.
- Update: `src/42go/layouts/public/types.ts` to export `TUserMenuConfig`.
- (No change) `src/42go/auth/components/UserMenu.tsx` stays for low-level auth dropdown (can be reused internally).

## Acceptance Criteria

- [ ] Anonymous users see a configurable CTA per `config.public.userMenu.publicCta`.
- [ ] Authenticated users see an avatar or fallback icon; hover opens dropdown by default.
- [ ] Supporting `userCta.label` renders a button; if `href` present, no dropdown is shown.
- [ ] Dropdown supports `items[]` with optional `divider` and `style` mapping; includes Logout action.
- [ ] `config.public.userMenu.disabled === true` hides the component.
- [ ] Mobile interaction opens a full-screen slide-in with the same items.
- [ ] Backwards compatibility: existing `AppConfig` that adds `{ type: "component", component: UserMenu }` still works (or is migrated with clear recipe).

## Edge Cases

- Missing session image: show generic user icon.
- No `dropDown.items` provided: show default Profile + Logout.
- Provided `href` for Logout: ignore; we use `signOut` with redirect target from `config.auth.logout.url`.
- Hover trigger on touch devices: always fall back to click/sheet.

## Open Questions

- Exact mapping of `style` values to shadcn Button variants: above mapping proposed; confirm or adjust.
- Should we auto-inject UserMenu into `ToolbarActions` when `config.public.userMenu` exists, or keep it as an explicit component action? (Proceeding with explicit action.)
- Preferred mobile container: `Dialog`, `Drawer/Sheet`, or custom panel? (Propose `Sheet`-like slide-in.)

## Next Steps

execute task (k3)
