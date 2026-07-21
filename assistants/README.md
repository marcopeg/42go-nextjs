# 42Go Assistants

Portable Agent Skills and installable plugins maintained by 42Go.

The reusable core of every integration is an [Agent Skill](https://agentskills.io): a directory containing `SKILL.md` plus any scripts, references, and assets it needs. Vendor-specific plugin manifests wrap those skills when an assistant supports a richer marketplace.

## Available integrations

| Name | Type | Description |
| --- | --- | --- |
| [QuickList](plugins/quicklist/skills/quicklist/SKILL.md) | Skill and plugin | Manage API-enabled QuickList lists and items from natural-language requests. |

## Install QuickList

### Codex plugin

Add this repository as a marketplace, then install the plugin:

```bash
codex plugin marketplace add marcopeg/42go-assistants
codex plugin add quicklist@42go-assistants
```

Refresh the marketplace before installing a newer release:

```bash
codex plugin marketplace upgrade 42go-assistants
codex plugin add quicklist@42go-assistants
```

Codex reads the catalog from `.agents/plugins/marketplace.json` and the plugin manifest from `plugins/quicklist/.codex-plugin/plugin.json`.

### Claude Code plugin

Inside Claude Code, add the marketplace and install the plugin:

```text
/plugin marketplace add marcopeg/42go-assistants
/plugin install quicklist@42go-assistants
/reload-plugins
```

Claude Code reads the catalog from `.claude-plugin/marketplace.json` and the plugin manifest from `plugins/quicklist/.claude-plugin/plugin.json`.

### Install only the skill

Clone the repository once:

```bash
git clone https://github.com/marcopeg/42go-assistants.git
cd 42go-assistants
```

Use the bundled dependency-free installer. Replace `cursor` with the desired target:

```bash
python3 scripts/install_skill.py quicklist --target cursor --scope user
```

Project installations default to the current directory. Use `--project-dir` when installing into another project:

```bash
python3 scripts/install_skill.py quicklist \
  --target cursor \
  --scope project \
  --project-dir /path/to/project
```

Supported targets and destinations:

| Assistant | `--target` | User installation | Project installation | Documentation |
| --- | --- | --- | --- | --- |
| Codex | `codex` | `~/.agents/skills/quicklist` | `.agents/skills/quicklist` | [Codex skills](https://developers.openai.com/codex/skills) |
| Claude Code | `claude` | `~/.claude/skills/quicklist` | `.claude/skills/quicklist` | [Claude Code skills](https://code.claude.com/docs/en/skills) |
| Cursor | `cursor` | `~/.cursor/skills/quicklist` | `.cursor/skills/quicklist` | [Cursor Agent Skills](https://cursor.com/docs/skills) |
| GitHub Copilot | `copilot` | `~/.copilot/skills/quicklist` | `.github/skills/quicklist` | [VS Code Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills) |
| OpenCode | `opencode` | `~/.config/opencode/skills/quicklist` | `.opencode/skills/quicklist` | [OpenCode Agent Skills](https://opencode.ai/docs/skills) |
| Gemini CLI | `gemini` | `~/.gemini/skills/quicklist` | `.gemini/skills/quicklist` | [Gemini CLI Agent Skills](https://geminicli.com/docs/cli/tutorials/skills-getting-started/) |
| Generic Agent Skills client | `agents` | `~/.agents/skills/quicklist` | `.agents/skills/quicklist` | [Agent Skills specification](https://agentskills.io/specification) |

The installer refuses to overwrite an existing installation unless `--force` is supplied. Inspect the changes first with `--dry-run`.

You can also install manually. Copy the complete `plugins/quicklist/skills/quicklist` directory—not only `SKILL.md`—into the appropriate skills directory. QuickList needs its bundled client and API reference.

## Configure QuickList

After installation, ask the assistant to configure QuickList. The skill will run:

```bash
python3 <installed-skill-directory>/scripts/quicklist.py configure
```

Paste the connection code copied from QuickList profile settings into the hidden terminal prompt. The connection code contains a bearer token. Treat it like a password. Do not commit credentials or paste the code into chat unless you deliberately accept the skill's documented mobile fallback.

Credentials are stored outside this repository in `~/.config/quicklist/credentials.json` with user-only permissions. Set `QUICKLIST_CREDENTIALS_FILE` to use another location.

## Repository structure

```text
.
├── .agents/plugins/marketplace.json       # Codex marketplace
├── .claude-plugin/marketplace.json        # Claude Code marketplace
├── plugins/
│   └── quicklist/
│       ├── .codex-plugin/plugin.json      # Codex adapter
│       ├── .claude-plugin/plugin.json     # Claude Code adapter
│       └── skills/quicklist/              # Portable Agent Skill
├── scripts/
│   ├── install_skill.py                   # Direct skill installer
│   └── validate_repository.py             # Repository validator
├── CONTRIBUTING.md
├── PUBLISH.md
└── SECURITY.md
```

Plugin directories are the canonical source. A skill is never duplicated into several vendor folders. Marketplace and manifest files are thin adapters around the same skill.

## Security

Skills and plugins can execute code with your user permissions. Review `SKILL.md` and bundled scripts before installation, pin trusted release tags when appropriate, and never commit generated credential files. See [SECURITY.md](SECURITY.md) for reporting instructions and the repository's security model.

## Developing and publishing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the plugin contract and validation workflow. Maintainers should follow [PUBLISH.md](PUBLISH.md) before releasing a version.

## License

A public license has not been selected yet. Add a root license before the first public release; publishing source code without a license does not grant others permission to reuse it.
