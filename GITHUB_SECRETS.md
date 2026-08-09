# GitHub Actions deployment secrets

The tag-triggered deployment workflow uses repository-level GitHub Actions
secrets. Configure these values for `marcopeg/42go-nextjs`:

- `DOCKERHUB_USERNAME` — Docker Hub account name that can push
  `marcopeg/42go-next`.
- `DOCKERHUB_TOKEN` — Docker Hub access token with write access to that image.
- `CAPROVER_URL` — Captain endpoint for the 42go production server.
- `CAPROVER_APP` — CapRover application name. The local default is
  `a42go-multi`; set this explicitly in GitHub so the deployment target is
  unambiguous.
- `CAPROVER_APP_TOKEN` — app token for that CapRover application. This is a
  separate secret from the assets app token.

Set or rotate them at the [repository Actions secrets page](https://github.com/marcopeg/42go-nextjs/settings/secrets/actions).
GitHub displays secret names and update times, but never the stored values.

## Release flow

From a clean `main` checkout, run:

```sh
make deploy.github
```

This bumps the patch version in `package.json` and `package-lock.json`, commits
`chore(release): <version>`, and pushes the matching `<version>` tag. Pushing
that tag starts the workflow. The workflow publishes
`marcopeg/42go-next:<version>`, updates `marcopeg/42go-next:latest`, deploys
the immutable version tag through CapRover, and creates the GitHub Release.
The local command then verifies that the public `/api/version` endpoint returns
HTTP 200 with exactly that version. Set `SKIP_DEPLOYMENT_VERIFY=1` only when
another automation performs the same public assertion.

For a minor or major release, use the helper with `--release minor` or
`--release major` as documented in `.agents/skills/42go-deploy/SKILL.md`.
