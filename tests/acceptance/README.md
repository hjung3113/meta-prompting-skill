# Acceptance evidence

`validate-static-contract.mjs` is a Markdown-only contract check. It does not
claim to invoke a model or prove conversation behavior.

`codex-smoke-transcript.json` is a sanitized recording of an on-demand live
Codex smoke run against the canonical skill. It was run on 2026-07-22 with
Codex CLI 0.144.6 in a fresh temporary git project whose
`.agents/skills/meta-prompt` was a symlink to `skills/meta-prompt/SKILL.md`.
The recorded SHA-256 ties the transcript to that exact canonical skill content.

To reproduce outside routine CI, create a fresh temporary git project, symlink
the canonical skill into `.agents/skills/meta-prompt`, then start and resume a
single Codex conversation one user turn at a time:

```sh
codex exec --json -C <fresh-project> '$meta-prompt'
codex exec resume --json <thread-id> '<next user turn>'
```

Use only synthetic context. Record every user and assistant turn, then run:

```sh
node tests/acceptance/validate-codex-smoke.mjs
```

The smoke command is intentionally on-demand and is not part of routine CI,
because it makes a live model call.
