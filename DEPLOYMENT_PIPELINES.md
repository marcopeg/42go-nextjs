# 42go Next.js Deployment Pipelines

This repository has two verified production deployment paths. Both deploy the
version in `package.json`; neither asks CapRover to run `latest`.

| Command | Build and publish location | CapRover trigger |
| --- | --- | --- |
| `make deploy.mac` | local Mac | local CapRover CLI |
| `make deploy.github` | GitHub Actions | semantic-version Git tag |

Both paths publish `marcopeg/42go-next:<version>` and update `latest` as a
convenience tag. CapRover receives only the immutable `<version>` tag. Each
image is a `linux/amd64,linux/arm64` manifest and has `APP_VERSION` baked into
it. The public endpoint `https://read.lingocafe.app/api/version` must return
HTTP 200 with that exact version before the command succeeds.

## Version contract

```text
package.json version:  0.0.81
Git tag:               0.0.81
Docker image tag:      0.0.81
/api/version body:     0.0.81
```

The Git tag intentionally has no `v` prefix. The GitHub workflow rejects a
tag that is not strict semantic versioning or does not exactly match the
checked-out `package.json` version.

## Local pipeline

Run from the intended checkout:

```sh
make deploy.mac
```

This builds and pushes the multi-architecture image, asks CapRover to deploy
`marcopeg/42go-next:<package-version>`, waits 30 seconds, then polls the public
version route every 10 seconds for up to five minutes. `make deploy` is an
alias. `make deploy.nocache` performs the same verified path without Docker
layer cache.

Local configuration belongs in ignored `.env`:

```dotenv
CAPROVER_URL=https://captain.example.com
CAPROVER_APP=a42go-multi
CAPROVER_APP_TOKEN=app-scoped-deploy-token
DEPLOYMENT_URL=https://read.lingocafe.app/api/version
```

## GitHub pipeline

From a clean checkout on `main`, run:

```sh
make deploy.github
```

The release helper bumps the patch version in `package.json` and
`package-lock.json`, commits `chore(release): <version>`, creates the matching
annotated tag, pushes the release commit to `main`, and pushes the tag. The tag
starts GitHub Actions, which performs the multi-architecture build, Docker Hub
push, CapRover deployment, and GitHub Release creation. The local command then
performs the same public version assertion.

For a minor or major version increment, run the helper with `--release minor`
or `--release major`.

Configure these repository Actions secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
CAPROVER_URL
CAPROVER_APP
CAPROVER_APP_TOKEN
```

`CAPROVER_APP_TOKEN` must be the token for the 42go CapRover app, not the assets
app token. See `GITHUB_SECRETS.md` for setup and rotation guidance.

## Verification

The check uses a cache-busting query parameter and requires both HTTP 200 and
an exact body match. Do not treat a successful Docker push or a CapRover CLI
response as proof that users are receiving the new container. Set
`SKIP_DEPLOYMENT_VERIFY=1` only for automation that makes the equivalent public
HTTP-status and exact-version assertion itself.
