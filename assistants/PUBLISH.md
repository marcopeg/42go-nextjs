# Publishing 42Go Assistants

This directory is designed to become the root of the public `marcopeg/42go-assistants` repository.

## Before the first release

1. Select and add a root open-source license. Do not publish as reusable open source without an explicit license.
2. Create the Git repository and update `README.md` if its final owner or name differs from `marcopeg/42go-assistants`.
3. Enable GitHub private vulnerability reporting or publish another private security contact referenced by `SECURITY.md`.
4. Confirm that no credentials, connection codes, local paths, caches, or generated files are tracked.

## Release checklist

1. Update the plugin's semantic version in:
   - `plugins/<plugin>/.codex-plugin/plugin.json`
   - `plugins/<plugin>/.claude-plugin/plugin.json`
   - `.claude-plugin/marketplace.json`
2. Update public descriptions, repository links, and installation instructions when behavior changes.
3. Run repository validation:

```bash
python3 scripts/validate_repository.py
```

4. Run the Codex validators when available:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/plugin-creator/scripts/validate_plugin.py" plugins/<plugin>
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" plugins/<plugin>/skills/<skill>
```

5. Exercise each bundled script and test at least one user-scope and project-scope direct installation in a temporary directory.
6. Test both local marketplaces before pushing:
   - Codex: `codex plugin marketplace add .`
   - Claude Code: `/plugin marketplace add .`
7. Commit, create a signed or annotated semantic-version tag, and push the branch and tag.
8. Test installation from the public repository using the commands in `README.md`.

## Updating consumers

Codex users refresh the catalog with:

```bash
codex plugin marketplace upgrade 42go-assistants
codex plugin add <plugin>@42go-assistants
```

Claude Code users refresh and reinstall with:

```text
/plugin marketplace update 42go-assistants
/plugin install <plugin>@42go-assistants
/reload-plugins
```

Direct-skill users pull the latest repository and rerun `scripts/install_skill.py` with `--force` after reviewing the changes.

## Adding another plugin

1. Create `plugins/<plugin>/skills/<skill>/SKILL.md` and its required resources.
2. Add matching Codex and Claude Code manifests.
3. Append matching entries to both root marketplace catalogs.
4. Add the integration to the root README.
5. Run the full release checklist.

The backlog skills can later move here as another plugin without changing the repository contract.

## Optional public directories

Git distribution works without central approval. Mature plugins may also be submitted to assistant-owned public directories:

- [OpenAI plugin submission guide](https://learn.chatgpt.com/docs/submit-plugins)
- [OpenAI plugin submission portal](https://platform.openai.com/plugins)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)

Directory review is an additional discovery channel. It does not replace this repository as the source of truth.
