# Acceptance evidence

`validate-static-contract.mjs` is a Markdown-only contract check. It does not
claim to invoke a model or prove conversation behavior.

`evidence/derived-transcript.json`, together with its raw JSONL and
`evidence/manifest.json`, is the only observed source. The manifest records
the supported model, UTC capture timestamp, Codex CLI version, thread ID,
canonical skill SHA-256, every raw hash, and the derived-transcript hash. It
is captured in a fresh temporary git project whose
`.agents/skills/meta-prompt` was a symlink to `skills/meta-prompt/SKILL.md`.
recorded SHA-256 values tie every view to that exact canonical skill content.

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

For a complete capture, run `init`, thirteen `step` commands, then `finalize`,
followed by `node tests/acceptance/derive-codex-transcript.mjs`.
It creates the fresh git project, records each raw JSONL turn, commands, exit
statuses, resolved skill link, hashes, version, and thread ID in its temporary
directory. The supplied turns are synthetic; do not add real user context.
