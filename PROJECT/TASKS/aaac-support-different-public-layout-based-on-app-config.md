# Support different public layout based on App-config [aaac]

The idea is to allow the AppConfig to define a `theme.PublicLayout` that references an imported layout component and defaults to the `components/PublicLayout`.

Then in the public layout (`src/app/(public)/layout.tsx`) we need to access the configuration, use the component from `theme.PublicLayout` or fallback on `components/PublicLayout` - I guess this logic belongs here.
