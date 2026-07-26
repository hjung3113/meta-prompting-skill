# Cross-tool installation

Run [`skills.sh`](../skills.sh) from this repository checkout with the target
project directory:

```sh
./skills.sh /path/to/project
```

It links the one canonical [Meta-Prompt skill](../skills/meta-prompt/SKILL.md)
into these native project locations:

- Codex: `.agents/skills/meta-prompt` — see the [Codex Capability Profile](../adapters/codex/CAPABILITY.md).
- Claude Code: `.claude/skills/meta-prompt` — see the [Claude Code Capability Profile](../adapters/claude/CAPABILITY.md).
- OpenCode: `.opencode/skills/meta-prompt` — see the [OpenCode Capability Profile](../adapters/opencode/CAPABILITY.md).

The installer refuses to replace an existing target and performs that check for
all three tools before it creates any links. Start a Fresh Run after
installation and follow the invocation guidance in the relevant Capability
Profile.

For repository verification, run the deterministic
[cross-tool contract](../tests/acceptance/validate-cross-tool-contract.mjs).
It validates packaging and behavioural coverage only; it does not make paid
model calls.
