---
name: 42go-deploy
description: Use this skill anytime the user asks for a deploy of the application.
---

# 42go Deploy

Use this skill when the user wants to deploy this application.

Keep it extremely simple.

Run this script and let it do the work:

```bash
python3 .agents/skills/42go-deploy/scripts/bump_patch_version.py
```

## Validation

- The script bumps the patch version in `package.json` and the top-level `package-lock.json`.
- The script immediately runs `make deploy`.
- It is okay to deploy from the current working tree in this project right now.

## Notes

- Do not add extra decision-making unless the user explicitly asks for it.
