# Move logout button to the profile's page top bar [aen]

Move the logout button from its current location to the top bar of the profile page. This will improve user experience by making the logout action more accessible and consistent with modern UI patterns.

The button must use the normal Button component and have an outlined style.

## Goals

- [ ] Identify the current location and implementation of the logout button
- [ ] Move the logout button to the profile page's top bar
- [ ] Use the normal Button component with outlined style for the logout button
- [ ] Ensure the logout functionality remains intact
- [ ] Update any relevant tests or documentation

## Acceptance Criteria

- [ ] Logout button is visible in the profile page's top bar
- [ ] Logout button uses the normal Button component with outlined style
- [ ] Logout uses a small dedicated component to keep concerns isolated
- [ ] Logout action works as before
- [ ] No UI or functional regressions
- [ ] Code and docs updated if needed

## Development Plan

1. Add Logout action to the Profile page top bar

   - File: `src/app/(app)/profile/page.tsx`
   - Use `AppLayout`'s `actions` prop to render a toolbar action.
   - Provide a `ComponentBlock` that renders a small dedicated component (e.g., `LogoutAction`) which uses the normal `Button` with `variant="outline"` and calls `signOut()` on click.
   - Keep the button label "Logout".

2. Remove the old Logout button from the RBAC Session panel actions

   - Same file: remove the destructive Logout button in `PolicySessionPanel` to avoid duplication. Keep "Refresh Session" action.

3. Behavior parity

   - Ensure `signOut()` is invoked the same way as before. A callback URL is not required unless already enforced elsewhere.
   - Verify mobile and desktop layouts show the outlined button in the top bar.

4. Light docs/tests
   - If any docs reference the logout location, update accordingly.

## Files to Change

- `src/app/(app)/profile/page.tsx` (move logout to `AppLayout` top bar actions; remove panel logout)
- `src/42go/auth/components/LogoutAction.tsx` (new) a tiny component that renders the outlined Button and calls `signOut()`

## Notes

- Top bar actions are powered by `AppLayout` → `Toolbar` → `ToolbarActions` using `TActionItem[]` (LinkBlock or ComponentBlock).
- Use the normal `Button` from `@/components/ui/button` with `variant="outline"`.
- Encapsulate logout behavior in `LogoutAction` so we don't inline logic in the page and keep reuse optional without scattering logout buttons.

## Next Steps

execute task (k3)
