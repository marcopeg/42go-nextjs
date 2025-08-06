# Next Standalone `.env` [acj]

I thought to check the produciton build for secrets and I noticed that `.next/standalone` contains a copy of `.env` and that file will end up into the production build.

This means that the produciton build contains secrets and this should NOT happen.

- Investigate why the .env is copied there
- Investigate what happens if we remove it durign the Dockerfile build
- Learn more about the NextJS build and how .env is supposed to work in prod
