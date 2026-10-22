# Dependency and Node update — 2026-10-22

Scope: the entire shared `42go-nextjs` app (including LingoCafe), production Docker image, development container Node version, and local Node selection. The separate `reader` repository contains planning documents rather than application code.

## Current state after frontmatter cleanup

The subsequent [frontmatter cleanup](2026-10-22-frontmatter-cleanup.md) removed the legacy Markdown CLI chain and CVE-2026-97058 from the dependency tree. Current production npm audit: **zero vulnerabilities**. Only the existing development `braces` advisory remains (five affected-package entries). The lockfile now contains 674 age-verified package/version pairs, and all 204 Node tests pass. Earlier counts and scan artifacts below describe the original dependency-update snapshot.

## Selection and supply-chain policy

The review started at 2026-10-22 09:22:45 UTC. The fixed npm publication cutoff was **2026-10-15 09:22:45 UTC**. Stable, non-deprecated versions were selected using the official npm registry publication metadata. The lockfile was regenerated from the updated manifest using that cutoff, then cold-installed with Node 24.22.1 and npm 12.2.0.

All **682 unique locked npm package/version pairs** pass the cutoff, including transitive and optional platform packages. No npm-package age exception was used. [Complete timestamp evidence](2026-10-22-dependency-age.json).

`.npmrc` sets `min-release-age=7` and `save-exact=true`. Docker installs reviewed npm 12.2.0 and applies `--min-release-age=7` explicitly. Its existing WASM compiler is now a pinned development dependency, so Docker no longer downloads it outside the lockfile. npm 12 lifecycle-script approvals cover only `bcrypt@6.0.0` and `unrs-resolver@1.12.2`, whose native setup entry points were reviewed.

## Node runtime security exception

The production image moves from a floating `node:22-alpine` reference to **Node 24.22.1 LTS / Alpine 3.24.3**, pinned to the official multi-platform image digest `sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53`. `.nvmrc` and the devcontainer Node package select the same Node patch. The runtime major stays on Active LTS rather than the Current release line.

Node 24.22.1 was released on October 21, less than seven days before this review. This runtime exception is based on the official [October security advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) and [24.22.1 release notes](https://nodejs.org/en/blog/release/v24.22.1/). They confirm a Brotli out-of-bounds write permitting remote code execution (CVE-2026-111497), TLS validation bypasses, and a DNS validation flaw affecting supported runtime lines. Node rates the most severe issues **HIGH**, not CRITICAL. The confirmed remote-code-execution fix justifies applying the security runtime immediately. This is not a claim that exploitation of this app was demonstrated.

The downloaded macOS ARM64 validation runtime was checked against the SHA-256 published in the official release notes. The pinned NodeSource devcontainer package was verified to exist. Production builds retain the existing webpack/WASM path used for AMD64 emulation.

## Security research

The official [Next.js October 14 security release](https://nextjs.org/blog/nextjs-security-update-october-14-2026) fixes critical server-component and image-processing issues in Next 16.4.1 and requires Sharp 0.35.5 or newer for the image issue. Those fixes, React 19.3.1, and Sharp 0.35.5 all meet the age rule. The old Sharp override was updated so it cannot defeat the framework fix.

npm audit changed from **16 affected packages (1 critical, 11 high, 4 moderate)** to **9 affected packages (0 critical, 5 high, 4 moderate)**. Production-only npm audit has **0 critical, 0 high, and 4 moderate** affected packages. Counts include packages affected through dependency chains, not nine distinct CVEs. See the saved [before](2026-10-22-npm-audit-before.json), [after](2026-10-22-npm-audit-after.json), and [production](2026-10-22-npm-production-audit.json) reports.

Two underlying advisories remain without patched npm releases:

- **CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm**, `braces@3.0.3`: high-severity recursion denial of service, reached through the development-only Next lint plugin → fast-glob → micromatch chain. The [upstream issue](https://github.com/micromatch/braces/issues/70) remains open; the maintainer disputes the vulnerability's applicability when callers use trusted glob patterns. This app does not pass remote user input into its lint configuration. The audit finding is retained, not suppressed.
- **CVE-2026-97058 / GHSA-hp3w-g68c-fv3c**, `sprintf-js@1.1.3`: moderate-severity denial of service from attacker-controlled format strings. The [upstream report](https://github.com/alexei/sprintf.js/issues/237) has no patched npm release. It enters the manifest tree through gray-matter → js-yaml's command-line interface → argparse; the YAML library's normal parser does not invoke that CLI. No incompatible override or audit suppression was added.

An empty CVE list cannot be promised while these upstream findings remain. Image scan results are recorded below separately from npm manifest findings.

## Compatibility holds and newer releases

- **ESLint 9.39.4** remains pinned. The installed React, import, and accessibility lint plugins still exclude ESLint 10 in their peer ranges. npm marks ESLint 9 deprecated; forcing ESLint 10 would create an unsupported dependency tree.
- **TypeScript 6.0.3** is the newest compatible 6.x release. The installed `typescript-eslint@8.71.2` peer range is `>=4.8.4 <6.1.0`, excluding TypeScript 7.0.2.
- **@types/node 24.19.2** is the newest eligible version matching the deployed Node 24 API, replacing unrelated Node 26 types.
- Newer Next/eslint-config-next 16.4.2, TanStack Query 5.104.5, lucide-react 1.61.0, PostCSS 8.5.31, Nodemailer 10.2.0, and npm 12.2.1 were under seven days old at the cutoff and were not selected. Next 16.4.1 already contains the official October security fixes.
- Other unchanged direct dependencies were already at their newest eligible stable releases. Prerelease auth/framework versions were excluded.

## Changed package selections

| Package / scope | Before | After | npm publication time (UTC) |
| --- | --- | --- | --- |
| `@radix-ui/react-dialog` (dependencies) | `1.1.23` | `1.3.1` | 2026-10-12T21:03:50.186Z |
| `@radix-ui/react-dropdown-menu` (dependencies) | `2.1.24` | `2.2.1` | 2026-10-12T21:02:48.671Z |
| `@radix-ui/react-popover` (dependencies) | `1.1.23` | `1.3.1` | 2026-10-12T21:03:17.606Z |
| `@radix-ui/react-slot` (dependencies) | `1.3.3` | `1.5.0` | 2026-10-12T00:48:46.238Z |
| `@tanstack/react-query` (dependencies) | `5.101.4` | `5.104.3` | 2026-10-15T07:53:35.788Z |
| `ajv` (dependencies) | `^8.20.0` | `8.20.0` | 2026-04-24T15:22:16.529Z |
| `lucide-react` (dependencies) | `1.30.0` | `1.57.0` | 2026-10-14T06:11:42.974Z |
| `next` (dependencies) | `16.3.0` | `16.4.1` | 2026-10-14T17:43:55.246Z |
| `nodemailer` (dependencies) | `9.0.5` | `10.1.1` | 2026-10-14T05:38:30.385Z |
| `pg` (dependencies) | `8.23.0` | `8.23.1` | 2026-09-30T15:39:58.489Z |
| `pg-query-stream` (dependencies) | `4.17.0` | `4.17.1` | 2026-09-30T15:38:46.082Z |
| `qrcode.react` (dependencies) | `^4.2.0` | `4.2.0` | 2024-12-11T17:22:40.569Z |
| `react` (dependencies) | `19.2.8` | `19.3.1` | 2026-10-14T16:47:15.290Z |
| `react-dom` (dependencies) | `19.2.8` | `19.3.1` | 2026-10-14T16:49:10.081Z |
| `react-syntax-highlighter` (dependencies) | `16.1.1` | `16.1.2` | 2026-10-08T15:58:23.214Z |
| `sanitize-html` (dependencies) | `2.17.6` | `2.18.1` | 2026-10-14T18:15:44.574Z |
| `sonner` (dependencies) | `2.0.7` | `2.0.8` | 2026-08-09T08:46:10.174Z |
| `tailwind-merge` (dependencies) | `3.6.0` | `3.7.0` | 2026-09-12T20:10:15.257Z |
| `uuid` (dependencies) | `14.0.1` | `14.0.3` | 2026-10-10T00:30:19.423Z |
| `zod` (dependencies) | `4.4.3` | `4.6.7` | 2026-10-12T16:29:37.778Z |
| `@next/swc-wasm-nodejs` (devDependencies) | `added` | `16.4.1` | 2026-10-14T17:28:54.600Z |
| `@types/node` (devDependencies) | `26.2.0` | `24.19.2` | 2026-10-09T18:44:25.189Z |
| `@types/nodemailer` (devDependencies) | `8.0.1` | `8.0.2` | 2026-09-15T20:36:24.078Z |
| `@types/react` (devDependencies) | `19.2.18` | `19.3.0` | 2026-09-09T18:08:49.750Z |
| `@types/react-dom` (devDependencies) | `19.2.4` | `19.3.0` | 2026-09-09T18:07:51.886Z |
| `@types/sanitize-html` (devDependencies) | `2.16.1` | `2.16.2` | 2026-09-28T23:36:43.291Z |
| `dotenv` (devDependencies) | `17.4.2` | `18.0.8` | 2026-10-14T15:51:09.752Z |
| `eslint-config-next` (devDependencies) | `16.3.0` | `16.4.1` | 2026-10-14T17:31:42.399Z |
| `typescript` (devDependencies) | `6` | `6.0.3` | 2026-04-16T23:38:27.905Z |
| `@types/react` (overrides) | `19.2.18` | `19.3.0` | 2026-09-09T18:08:49.750Z |
| `@types/react-dom` (overrides) | `19.2.4` | `19.3.0` | 2026-09-09T18:07:51.886Z |
| `nodemailer` (overrides) | `9.0.5` | `10.1.1` | 2026-10-14T05:38:30.385Z |
| `postcss` (overrides) | `8.5.26` | `8.5.30` | 2026-10-12T20:38:43.212Z |
| `sharp` (overrides) | `0.35.0` | `0.35.5` | 2026-09-27T13:46:24.509Z |

## Verification

- Cold install with Node 24.22.1 and npm 12.2.0: passed; `npm ls --all` has no invalid dependency tree.
- `npm run qa`: lint and production build passed. One non-blocking navigation warning in the existing authenticated layout is also present before the update; no application source was changed.
- Node tests after the follow-up test repairs: **197/197 pass**, covering both `tests/*.test.mts` and `tests/*.test.mjs`. The original dependency-only run passed 185/188 `.mts` tests; its three pre-existing failures were stale expectations, now repaired as described below.
- Python tests: 17/17 pass.
- Native bcrypt hash/compare, Nodemailer in-memory message rendering, Markdown YAML parsing, and PostgreSQL query-stream constructor smoke checks pass. No message was sent and no database was changed.
- Standalone HTTP smoke checks pass for health, login pages on LingoCafe / QuickList / default hosts, LingoCafe auth-provider discovery, and 401 responses on unauthenticated LingoCafe / QuickList APIs. Checks use a synthetic auth secret and an unreachable dummy database URL; no live credentials or database are required.
- Final **linux/amd64 Docker build passed** using the compiler from the verified lockfile. Local image: `42go-next:dependency-review-20261022`; image ID `sha256:2824f0c4d0a5c499f9d664907e2e813ae1014cdb6f09dc4924195856c2246ff5`.
- The repository's full [image security gate](2026-10-22-image-security.md) passed with exit code 0, including QA in the actual app checkout. Trivy 0.70.0 with a freshly downloaded vulnerability database found **zero image vulnerabilities** across 19 OS packages and 54 detected Node package records. [Image scan evidence](2026-10-22-image-vulnerabilities.json).
- Source secret scan: zero findings. Docker configuration scan retains one existing LOW item, DS-0026 (no HEALTHCHECK), which does not block the repository gate. This is a configuration note, not a CVE.
- Final runtime inspection confirms Node 24.22.1, UID 1001, no package manager executable, no env/npmrc files, no source maps or database dumps, and no `braces`, `argparse`, or `sprintf-js` directory at any depth.
- All seven [HTTP checks in the exact final container](2026-10-22-container-smoke.json) pass, including LingoCafe page identity and the expected credentials/email/Google auth provider list. The temporary container was removed afterward. Full login flows requiring a real database or external OAuth/SMTP service were not exercised.

No deployment or registry publication was performed.

## Follow-up test repairs

All three original failures came from expectations that predated intentional application changes. No application code or seed data needed to change.

- Notifications: `tests/communications.test.mts` expected the old combined mobile/desktop border class expression from before the PlainList refactor in commit `8f9c924`. The check now loads the actual component using the repository's existing TSX test technique and verifies the resulting classes for regular and mobile-flush lists, including the retained desktop border.
- Conversation reader: `tests/lingocafe-conversations-api.test.mts` still expected 1.75rem bottom padding, changed to 7.5rem for floating translation controls in commit `9870a7e`. The dedicated `lingocafe-translation-scope-fab.test.mts` already checked that clearance; playback-open 13rem clearance is now checked there too. The progress/API test keeps its progress and authorization checks.
- Conversation seed: `tests/lingocafe-conversations-schema.test.mts` retained counts from before the corpus expansion in commit `9a3851e` and subsequent localization updates. It now checks the accepted 174 scenarios, 2,068 scenario localizations, 201 memberships, 348 actors, 712 variant localizations, and 7,422 rounds. Additional assertions verify unique IDs and round positions, valid scenario/variant/conversation/actor references, nonempty dialogue, and dialogue coverage for every conversation.

Validation in the actual checkout with Node 24.22.1: 197/197 Node tests, 17/17 Python tests, and `npm run qa` pass. The existing navigation lint warning remains unchanged. These changes affect only tests and this report; tests and docs are excluded from the production Docker build context.
