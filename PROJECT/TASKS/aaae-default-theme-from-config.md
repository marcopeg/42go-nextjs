# Support default theme in App config

Right now the theme defaults to the system preferences unless the user changes it. In such a case, the preference it is stored in the Local Storage.

The goal is to optionally expose a `theme.default` property in each App's config that sets the default theme to use if no Local Storage preference is available.

If no information is available, then the browser's setting should be used.

# Acceptance Criteria

- [ ] If the matched app exposes `theme.default` then this value is used as the active theme
- [ ] If the local storage contains a prefecence, such information is used as the active theme
- [ ] If no information is available, the browser's settings is used as the active theme

# Notes

The full typing for the `theme` and `theme.default` app config properties should be added to `src/AppConfig.ts`.

Both `theme.default` and even the whole `theme` should be optional configuration settings.
