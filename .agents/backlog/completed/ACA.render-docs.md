# Render Docs [aca]

Import the rendering of Markdown based documentation from the old project.

# Development Plan

## ✅ 1. Import Files

Imported the raw functionality by copying files over and adjusting the dependencies.

## ✅ 2. Customize Source Path

The source path for the files must be provided per single app config and acts as ground feature flag to erogate the functionality.

NOTE: the code is a freaking mess from Cursor! I will have to spend months refactoring this `s**t`!

## ✅ 3. Apply Feature Flag

Wrap the docs pages with the feature flag wrapper so to make it part of the whitelist pages mechanism.

The functionality answers to the permission `docs`.

## ✅ 4. Adjust styles

I've improved the `PublicLayout` so to be wider and host the docs.
