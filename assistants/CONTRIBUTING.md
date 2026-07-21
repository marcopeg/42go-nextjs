# Contributing

This repository publishes portable Agent Skills with optional assistant-specific plugin adapters.

## Add a skill or plugin

Use this shape:

```text
plugins/<plugin-name>/
├── .codex-plugin/plugin.json
├── .claude-plugin/plugin.json
└── skills/
    └── <skill-name>/
        ├── SKILL.md
        ├── scripts/       # optional
        ├── references/    # optional
        └── assets/        # optional
```

Rules:

1. Use lowercase kebab-case names. The directory and manifest names must agree.
2. Keep `SKILL.md` compatible with the [Agent Skills specification](https://agentskills.io/specification). Vendor-only frontmatter belongs in an adapter, not the portable skill.
3. Resolve bundled files relative to the skill directory. Installed plugins run from cache directories, not from this repository.
4. Keep credentials, tokens, local paths, caches, and generated output out of the repository.
5. Add the plugin to both marketplace catalogs and keep manifest and catalog versions synchronized.
6. Add installation and configuration notes to the root `README.md` when the new integration needs them.

A plugin may contain several related skills. Do not duplicate the same skill under several assistant-specific directories.

## Validate

From the repository root:

```bash
python3 scripts/validate_repository.py
python3 scripts/install_skill.py quicklist --target agents --scope project --dry-run
```

When Codex's authoring tools are installed, also run:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/validate_plugin.py" plugins/<plugin-name>
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" plugins/<plugin-name>/skills/<skill-name>
```

Run each bundled script's own tests or safe read-only commands. For QuickList:

```bash
python3 plugins/quicklist/skills/quicklist/scripts/quicklist.py --help
```

## Pull requests

Explain the user-facing behavior, security implications, validation performed, and any migration required by existing installations. Never include real credentials in fixtures, screenshots, logs, or examples.
