---
name: 42go-deploy
description: Use this skill anytime the user asks for a deploy of the application.
---

# 42go GitHub Release

Use this skill when the user wants to release or deploy this application.

Production deployment is tag-triggered. The release version must be committed
before the tag is pushed, so the tag always identifies the exact
`package.json` version that was built and deployed.

## GitHub Deployment Workflow

Run the host QA gate first:

```bash
npm run qa
```

Then, from a clean checkout of `main`, run:

```bash
make deploy.github
```

Do not build or scan a Docker image locally for this workflow. GitHub Actions
owns the release image build, publish, and deployment. Use the Docker security
check only when the operator explicitly requests it or when using a local
image publish/deploy workflow.

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
same public-version verification. Run the Docker security gate before this
local image workflow. `make deploy` remains an alias for this path.

## Production Database Deployments

Treat a request to deploy migrations or seeded LingoCafe content as a
production database mutation, not an application release. Do not bump a
version, create a tag, build an image, or run `make deploy.github` for these
requests.

Recognize these request phrases and prepare exactly one matching command:

| User request | Command after confirmation |
| --- | --- |
| `deploy migrations` or `deploy migration` | `make prod.migrate.idangerouslyconfirm` |
| `deploy seed` | `make prod.seed.idangerouslyconfirm` |
| `deploy seed <xxx>` | `make prod.seed.file.idangerouslyconfirm file=<exact committed seed basename>` |
| `deploy books` | `make prod.lc.books.idangerouslyconfirm` |
| `deploy convs`, `deploy conversations`, or `deploy conversation content` | `make prod.lc.convs.idangerouslyconfirm` |

Before executing any command in this table, stop and ask for fresh, explicit
confirmation in the conversation. State the exact command in backticks and
that it modifies the database selected by `.env.prod`. Use this form:

> Ready to run `<exact command>`. This modifies the database selected by
> `.env.prod`. Reply `confirm` to run it.

Execute only after the user replies `confirm` in a later message. A previous
confirmation, a vague acknowledgement, or confirmation of a different command
does not count. After confirmation, run the corresponding
`.idangerouslyconfirm` target directly; it is intentionally non-interactive so
the conversation confirmation is the authorization gate. Report the result
without displaying environment values or database connection details.

For `deploy seed <xxx>`, first resolve `<xxx>` to exactly one basename in
`knex/seeds/*.js`. Never interpolate an unverified user-supplied string into a
command. If it is not an exact unambiguous committed seed, list the matching
filenames or ask the user to choose one; do not ask for confirmation yet. Once
resolved, include that exact basename in the confirmation command. `deploy
seed` without a basename runs the complete seed collection.

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
