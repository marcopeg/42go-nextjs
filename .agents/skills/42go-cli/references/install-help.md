# 42Go CLI Install And Help

Use this reference when an operator needs to install, update, or discover the `42go` CLI.

## Install

Normal install from this repository:

```bash
pipx install ./cli
```

Development install from this repository:

```bash
pipx install --force --editable ./cli
```

Uninstall:

```bash
pipx uninstall 42go-cli
```

## Root Commands

- `42go`
- `42go --help`
- `42go --version`
- `42go update`
- `42go pull`
- `42go peek`
- `42go backup`
- `42go restore`

`42go events`, `42go users`, and `42go query` are intentionally not available.

## Troubleshooting

- Missing optional runtime packages usually means the CLI is not installed from `./cli`.
- Run command-specific `--help` before guessing flags.
- If behavior differs from this doc, trust the command help first, then update this skill.
