# Frontmatter dependency cleanup — 2026-10-22

## Result

The app no longer depends on `gray-matter`, legacy `js-yaml` 3.x, `argparse` 1.x, or `sprintf-js`. Both documentation and the browser-side public-note viewer use one shared YAML frontmatter parser backed by `vfile-matter` 5.0.1 and `vfile` 6.0.3. The transitive YAML parser is `yaml` 2.9.1. The [maintainer API](https://github.com/vfile/vfile-matter) supports both Node and browser use; it adds only `vfile` and `yaml` dependencies.

This removes **CVE-2026-97058 / GHSA-hp3w-g68c-fv3c** from the dependency tree, without an override or vulnerability suppression.

The current [production npm audit](2026-10-22-frontmatter-production-audit.json) reports **zero vulnerabilities**. The [complete npm audit](2026-10-22-frontmatter-npm-audit.json) now reports five high affected-package entries, all propagating from the one existing development-only `braces` advisory (CVE-2026-93687). The ESLint-owned `js-yaml` 4.3.2 / `argparse` 2.0.1 pair remains needed by lint tooling and has no `sprintf-js` dependency.

## Compatibility and verification

- Before removal, the new parser's metadata and exact Markdown body were compared against the old parser for **all 21 existing Markdown/MDX documents**; all match.
- Shared parsing preserves YAML mapping values, timestamps, merge keys, multiline text, JSON-style mappings, BOM handling, and Windows newlines. The note viewer retains its existing raw-text fallback for invalid YAML.
- The new parser handles YAML frontmatter only and has no JavaScript evaluation engine. Regression tests cover malformed metadata, non-mapping values, unclosed headers, plain Markdown horizontal rules, and excessive YAML alias expansion.
- **204/204 Node tests** pass, including seven frontmatter tests. Python tests: **17/17 pass**.
- All **674 locked npm package/version pairs** satisfy the original publication cutoff of **2026-10-15 09:22:45 UTC**. No age exception was needed. [Timestamp evidence](2026-10-22-frontmatter-age.json).
- Cold install succeeds. The installed dependency tree has no invalid entries. Native lint/build QA passes with the same existing navigation warning.
- Final **linux/amd64 Docker build passes**. Local image: `42go-next:frontmatter-cleanup-20261022`; ID `sha256:5606392cfae1f1658032a08286c998a1d16293a07715ebf03ca0623f04e201fd`.
- The [full repository security gate](2026-10-22-frontmatter-image-security.md) passes with exit code 0, including QA in the actual checkout. The image vulnerability scan reports **zero findings**; source secret scan also reports zero findings. The existing LOW Docker configuration note (missing HEALTHCHECK) is unchanged. [Image scan evidence](2026-10-22-frontmatter-image-vulnerabilities.json).
- All **nine container HTTP checks** pass, including documentation list/detail rendering, parsed title/excerpt/date, health, login/provider discovery, and unauthorized API rejection. [Smoke results](2026-10-22-frontmatter-container-smoke.json). These checks use synthetic auth settings and an unreachable dummy database endpoint, without live credentials or database mutations.
- The final image contains no `gray-matter`, `sprintf-js`, `argparse`, or `js-yaml` package directory at any depth. The temporary smoke container was removed.

The earlier dependency-update image and audit reports record the state before this cleanup. No deployment or image publication was performed.
