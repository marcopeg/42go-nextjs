# Implement Public Layout - aaau

Simplify the root layout by moving Nav and other UI responsibilities into a dedicated component that might be used as Page's wrapper instead.

# Acceptance Criteria

- [x] Root's layout has no presentation responsibilities in it
- [x] Root's layout has one single version for app/non-app renderings
- [ ] Find a cleaner NextJS approach for the HomePage

# Implementation Notes

I've created the `@/components/PublicLayout` that hosts the navigation responsibility (pure presentational) and cleaned out the `RootLayout` from any presentational respnsibility.

I'm happy now with the root layout cleanliness.

I'm happy how I've managed to apply the PublicLayout to the `/todos` route, but less satisfied with the `HomePage` where I had to import it and use it as a wrapper at React level. There must be a better approach.
