# Fix Docker build [aem]

Investigate and fix why Next.js middleware doesn’t appear to execute when the app is built and run in Docker with `output: "standalone"` using `node server.js`. Locally with `next start`, middleware logs and debug headers are visible; in the container they’re not, and `getAppID` warns the header is missing.

## Goals

- [ ] Ensure middleware executes in production containers.
- [ ] Confirm via response headers that middleware ran (`x-mw-probe`, `x-mw-host`, `x-mw-appid`).
- [ ] Keep AppConfig unchanged for this fix.

## Acceptance Criteria

- [ ] `curl -i http://localhost:4000/` shows `x-mw-probe: 1` and `x-mw-host`.
- [ ] `curl http://localhost:4000/api/test/app-id` returns a non-null `appID` when matched.
- [ ] No regression in dev (`next dev`) or local prod (`next start`).

## Context & Findings

- Local `yarn start` (next start): middleware logs are printed and debug headers are present.
- Docker (standalone `node server.js`): no middleware logs; no debug headers; `getAppID()` warns header missing.
- Temporary workaround confirmed: setting `APP_ID` in the container environment makes prod work (fixed app selection), proving the rest of the pipeline is healthy and the issue is specifically middleware execution.
- Build output shows `ƒ Middleware 53.2 kB` (compiled), but execution appears absent in container.
- Host observed in container responses: `localhost:4000`. Default app regex already supports ports; missing header points to middleware not executing rather than a bad match.

## Proposed Solutions

1. Switch container runner to `next start` (Recommended)

- Build with `next build` (drop or ignore `output: "standalone"`).
- Copy full `.next` and run `next start` in the container.
- Expect middleware to execute, matching local behavior.

2. Keep standalone, add a minimal wrapper or proxy

- Put a reverse proxy (nginx/traefik) or a Node wrapper that ensures middleware-equivalent behavior or injects the required header as a stopgap.

3. Keep standalone, verify middleware artifacts wiring

- Inspect `middleware-manifest.json` presence in the runtime used by the container and whether `server.js` wires middleware. Adjust Dockerfile copy if needed.

## Execution Plan

- [ ] Keep temporary debug headers in middleware (`x-mw-probe`, `x-mw-host`, `x-mw-appid`).
- [ ] Prototype Option 1: modify Dockerfile to use `next start`; validate headers appear in prod.
- [ ] If Option 1 passes, finalize Docker changes and remove debug headers later.
- [ ] If standalone must be kept, proceed with Option 3 investigation and/or Option 2 proxy.

## Verification

- [ ] `make prod` → `curl -i http://localhost:4000/` contains `x-mw-probe`.
- [ ] `curl http://localhost:4000/api/test/app-id` returns expected `appID`.

## Research Ideas

- Next.js docs/issues for “standalone + middleware”: behavior on Next 15.x.
- Confirm Edge middleware support in standalone and logging behavior.
- Search terms:
  - "next standalone middleware not running"
  - "Next.js middleware missing in Docker"
  - "Edge runtime logging standalone"
- Check examples combining Docker + middleware + standalone.

## Next Steps

- Implement Option 1 and test. If green, merge and close.
- If not viable, document findings and pivot to Option 3/2.
