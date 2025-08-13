# Abstract Panel Component [aec]

✅ COMPLETE - SRP panel primitives + SimplePanel sugar, policy-aware panels, profile page refactored.

See original draft for full design: `../draft/aec-abstract-panel-component.md`.

## Highlights

- Introduced primitives: Panel, PanelHeader, PanelTitle, PanelDescription, PanelActions, PanelBody, PanelFooter
- Added SimplePanel convenience component (title, description, actions, policy props)
- Policy integration hides entire panel when access denied
- Profile page fully refactored to use panels (Account, Preferences, Security, Special Data, RBAC Session)
- Consistent styling consolidated (`rounded-lg border bg-card p-*`)
- Future variant hooks prepared (`variant`, `padding`, `gap`)

## Follow-Ups (Deferred)

- Implement visual variants (muted, outline)
- Collapsible / loading / status badge features
- Heading level override prop
- Footer real use cases & docs snippet article
