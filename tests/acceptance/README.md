# Acceptance evidence

`validate-static-contract.mjs` is a Markdown-only contract check. It does not
claim to invoke a model or prove conversation behavior.

`evidence/derived-transcript.json`, together with its raw JSONL and
`evidence/manifest.json`, is the only observed source. The manifest records
the supported model, UTC capture timestamp, Codex CLI version, thread ID,
canonical skill SHA-256, every raw hash, and the derived-transcript hash. It
is captured in a fresh temporary git project whose
`.agents/skills/meta-prompt` is a symlink to the canonical `skills/meta-prompt`
directory; the manifest separately records the resolved `SKILL.md` path and hash.
recorded SHA-256 values tie every view to that exact canonical skill content.

To reproduce outside routine CI, create a fresh temporary git project, symlink
the canonical skill into `.agents/skills/meta-prompt`, then start and resume a
single Codex conversation one user turn at a time:

```sh
codex exec --json --model gpt-5.6-terra -C <fresh-project> '$meta-prompt'
codex exec resume --json --model gpt-5.6-terra <thread-id> '<next user turn>'
```

Use only synthetic context. Record every user and assistant turn, then run:

```sh
node tests/acceptance/validate-codex-smoke.mjs
```

The smoke command is intentionally on-demand and is not part of routine CI,
because it makes a live model call.

For a complete capture, run these exact commands (one `step` per live turn):

```sh
node tests/acceptance/capture-codex-smoke.mjs init tests/acceptance/evidence --replace
for n in $(seq 1 13); do node tests/acceptance/capture-codex-smoke.mjs step tests/acceptance/evidence; done
node tests/acceptance/capture-codex-smoke.mjs finalize tests/acceptance/evidence
node tests/acceptance/derive-codex-transcript.mjs
node tests/acceptance/validate-codex-smoke.mjs
```
It creates the fresh git project, records each raw JSONL assistant event and
terminal status, and records synthetic user inputs only in manifest command
arguments. The known non-secret chronicle warning and its local path are host
noise; validation permits that exact non-agent event but does not treat it as
assistant evidence.
