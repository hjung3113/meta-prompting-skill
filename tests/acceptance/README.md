# Acceptance evidence

`validate-static-contract.mjs` is a Markdown-only contract check. It does not
claim to invoke a model or prove conversation behavior.

`evidence/derived-transcript.json`, together with its raw JSONL and
`evidence/manifest.json`, is the only observed source. The manifest records
the supported model, UTC capture timestamp, Codex CLI version, thread ID,
canonical logical skill identity (`skills/meta-prompt/SKILL.md`), capture-time
resolved absolute skill path (historical only), canonical skill SHA-256, every
raw hash, and the derived-transcript hash. It
is captured in a fresh temporary git project whose
`.agents/skills/meta-prompt` is a symlink to the canonical `skills/meta-prompt`
directory. Validation requires the exact repository-logical identity and checks
the current checkout's canonical file bytes against the captured SHA-256; the
absolute capture-time path is informational and is never compared to a checkout
path.

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
node tests/acceptance/portable-checkout.test.mjs
```

The smoke command is intentionally on-demand and is not part of routine CI,
because it makes a live model call.

For a complete capture, use an external directory and run exactly one `step`
per live turn. After every step, inspect `checkpoint.json`: continue only while
it names one pending registered decision; when it reaches `phase: "approval"`,
run one approval step; it must then reach `phase: "complete"`. Never use a
fixed turn count or a shell loop: the register controls the number and order of
clarifications.

```sh
capture_dir=$(mktemp -d /tmp/meta-prompt-capture.XXXXXX)
node tests/acceptance/capture-codex-smoke.mjs init "$capture_dir"
node tests/acceptance/capture-codex-smoke.mjs step "$capture_dir"
# Inspect "$capture_dir/checkpoint.json" and the corresponding raw turn, then
# repeat exactly one step at a time until phase is complete.
node tests/acceptance/capture-codex-smoke.mjs finalize "$capture_dir"
# Copy only the completed generated manifest/raw bundle into evidence/, derive,
# regenerate evidence-lock.json from immutable bytes, then validate.
node tests/acceptance/derive-codex-transcript.mjs
node tests/acceptance/validate-codex-smoke.mjs
```
It creates the fresh git project, records each raw JSONL assistant event and
terminal status, and records synthetic user inputs only in manifest command
arguments. The known non-secret chronicle warning and its local path are host
noise; validation permits that exact non-agent event but does not treat it as
assistant evidence.
