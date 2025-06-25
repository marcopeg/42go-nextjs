# Support Accent Color

I would like to set the accent color as part of the app's configuration:

```tsx
export const availableApps = {
  default: {
    theme: {
      colors: {
        accent: "#ffffff",
      },
    },
  },
};
```

This should be somehow passed down to the CSS system so to be applied to stuff like:

- hero titles
- buttons background
- etc

I expect also that the foreground OR background of items that implement the accent color should be calculated automatically.

# Acceptance Criteria

- [ ] App1 defines a bright orange as accent, App2 defines a bright green
- [ ] App1's buttons have the bright orange as background color
- [ ] App2's buttons have the bright green as background color
