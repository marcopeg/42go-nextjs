# Make the app iPhone home-screen compatible [acx]

Enable the app to be installed on the iPhone home screen as a PWA, with config-driven name and icon.

## Goals

- [ ] Allow users to install the app on iPhone home screen
- [ ] Use config.pwa.name and config.pwa.icon for meta tags
- [ ] Centralize meta tag logic in a custom component under @/42go
- [ ] Support both (public) and (app) route groups

## Acceptance Criteria

- [ ] If config.pwa.name or config.pwa.icon is set, meta tags are rendered
- [ ] Meta tags work for iPhone home screen installation
- [ ] Component is reusable and lives under @/42go
- [ ] Works for both (public) and (app) routes

## Next Steps

- plan task (k2)
