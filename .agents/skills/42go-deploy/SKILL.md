---
name: 42go-deploy
description: Use this skill anytime the user asks for a deploy of the application.
---

# 42go GitHub Release

Use this skill when the user wants to release or deploy this application.

Production deployment is tag-triggered. The release version must be committed
before the tag is pushed, so the tag always identifies the exact
`package.json` version that was built and deployed.

From a clean checkout of `main`, run:

```bash
make deploy.github
```

The target runs the release helper, which:

- bumps the patch version in `package.json` and `package-lock.json`;
- commits those files as `chore(release): <version>`;
- creates the annotated tag `<version>` (with no `v` prefix);
- pushes the release commit to `main`, then pushes the tag.

The tag push triggers GitHub Actions, which builds and publishes the Docker
image and deploys that immutable image through CapRover. The release helper
then waits and verifies that `https://read.lingocafe.app/api/version` reports
the exact release version. Set `SKIP_DEPLOYMENT_VERIFY=1` only when the caller
performs the equivalent public verification itself.

For a direct deployment from the Mac, run:

```bash
make deploy.mac
```

It publishes the current `package.json` version as a multi-architecture image,
uses the local CapRover CLI to deploy that immutable image, and performs the
same public-version verification. `make deploy` remains an alias for this path.

## Preconditions

- The working tree must be clean.
- The checkout must be on `main`.
- `origin` must be reachable and permit pushes to `main` and tags.
- Repository Actions secrets must be configured as documented in
  `GITHUB_SECRETS.md`.

For a deliberate minor or major release, invoke the helper directly:

```bash
python3 .agents/skills/42go-deploy/scripts/bump_patch_version.py --release minor
python3 .agents/skills/42go-deploy/scripts/bump_patch_version.py --release major
```
