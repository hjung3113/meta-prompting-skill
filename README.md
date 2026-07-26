# Meta-Prompt

Meta-Prompt is one guided Refinement Session that turns an unstructured idea
into an approved, execution-ready prompt. It has one canonical workflow and
directly verified project-skill adapters for Codex, Claude Code, and OpenCode.

## Install

Clone this repository, then run the installer from its root against a clean
project you want to use with all three tools:

```sh
./skills.sh /path/to/project
```

It creates project-native links at `.agents/skills/meta-prompt`,
`.claude/skills/meta-prompt`, and `.opencode/skills/meta-prompt`. It refuses
to replace an existing skill, so remove or rename an old installation yourself
before retrying. See the [installation guide](docs/installation.md) for each
tool's explicit invocation.

## First use

Start a **Fresh Run** in the tool you selected and explicitly invoke the skill:

- Codex: `$meta-prompt`
- Claude Code: `/meta-prompt`
- OpenCode: ask OpenCode to use the `meta-prompt` skill and approve the skill
  request if your `permission.skill` setting asks first.

The first reply explains the **Context Dump**. Send your raw context over one
or more messages, then end it with `덤프 끝` or `dump complete`. Until that
**Dump Complete Signal**, Meta-Prompt only acknowledges receipt; it does not
analyse, design, solve, or generate the task.

After the signal, it confirms the Target Tool and Prompt Budget, investigates
available workspace facts read-only when relevant, and asks one decision at a
time. It shows an Alignment Gate containing observable Acceptance Criteria and
waits for your approval before generating anything.

## Copy the output

After approval, Meta-Prompt produces three separate sections in this order:

1. **English Final Prompt** — copy this section only.
2. **Review Translation** — Korean text for checking the English prompt; do
   not paste it into the executing conversation.
3. **Run Instructions** — start a Fresh Run in the confirmed Target Tool and
   follow its attachment, budget, and verification guidance.

Meta-Prompt refines a task; it never executes the Final Prompt in the
exploratory conversation.

## Limitations

- Codex, Claude Code, and OpenCode are the only First-Class Tools. Other
  coding agents use the portable workflow without a first-class compatibility
  claim.
- The direct project-skill installer is the supported path. Marketplace or
  plugin availability depends on the host tool and is not guaranteed.
- Meta-Prompt does not infer dump completion, persist raw Context Dumps by
  default, or make inaccessible Context Assets available to the Target Tool.
- Routine validation is deterministic and makes no paid model calls. The real
  Fresh-Run smoke records for the three First-Class Tools are retained under
  [`tests/acceptance`](tests/acceptance/README.md).

## Field Evaluation

After a completed Fresh Run, you may optionally submit a sanitised
[Field Evaluation](docs/field-evaluation.md) report. It is development-only,
requires your approval before publication, and does not collect telemetry or
change the normal Meta-Prompt workflow.

## Update

Pull the latest repository revision, then rerun the installer for a project
after removing or renaming its existing `meta-prompt` links. The installer is
intentionally non-destructive and will refuse to overwrite them.

## Verify and release status

Run the release-candidate validation from the repository root:

```sh
node tests/acceptance/validate-release-candidate.mjs
```

It checks the canonical [Meta-Prompt skill](skills/meta-prompt/SKILL.md),
adapter linkage, installation command, documentation links, release checklist,
and retained smoke-record shape. It does not call a model. The checked v0.1.0
criteria and the separate post-acceptance Public-conversion action are in the
[release checklist](docs/release-checklist.md).

## Contribute

This project is licensed under the [MIT License](LICENSE) for independently
authored Meta-Prompt content. Keep the canonical skill as the one workflow
source, keep tool adapters thin, and do not add Matt Pocock development skills
to the product distribution. See the [scope-control guide](docs/agents/scope-control.md)
before proposing issue work.
