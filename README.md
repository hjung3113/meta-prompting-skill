# Meta-Prompt

Meta-Prompt runs one Refinement Session that turns a Context Dump into an
approved, execution-ready prompt while preserving the same Shared Workflow
across its First-Class Tools.

## Install

From this repository checkout, install the canonical `meta-prompt` skill for
Codex, Claude Code, and OpenCode in one clean project:

```sh
./skills.sh /path/to/project
```

The command creates the three project-native links without replacing an
existing installation. See the [installation guide](docs/installation.md) for
the installed locations and tool-specific invocation details.

## Verify

Run the deterministic cross-tool contract:

```sh
node tests/acceptance/validate-cross-tool-contract.mjs
```

The contract checks the canonical [Meta-Prompt skill](skills/meta-prompt/SKILL.md),
the shared Acceptance Scenario matrix, adapter metadata, installation linkage,
and documentation links. It does not call a model.
