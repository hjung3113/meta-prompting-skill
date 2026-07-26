# v0.1.0 release checklist

This is the bounded acceptance checklist for Issue #8. It checks the fifteen
v1 completion criteria approved in parent Issue #1; it is not a new Quality
Gate or evidence/provenance system.

## Checked completion criteria

- [x] One canonical skill and no tool-specific workflow copies —
  `skills/meta-prompt/SKILL.md` is canonical; the cross-tool contract rejects
  duplicate adapter workflow content.
- [x] One `skills.sh` command installs for all three tools —
  `skills.sh` and the cross-tool contract create and verify all three links.
- [x] First invocation explains dumping and completion — covered by the
  canonical skill and the `first-use-context-dump` Acceptance Scenario.
- [x] No analysis or generation before completion — covered by the canonical
  skill and the `receipt-before-completion` Acceptance Scenario.
- [x] Target Tool confirmation and relevant read-only grounding — required by
  the canonical skill and static contract.
- [x] One-at-a-time questions with recommendations — covered by the
  `one-recommended-decision` Acceptance Scenario.
- [x] Observable Acceptance Criteria before alignment approval — covered by
  the `approved-alignment-gate` Acceptance Scenario.
- [x] No Final Prompt before user approval — required by the canonical skill
  and checked through the approved-alignment scenario.
- [x] Separate English Final Prompt, Korean Review Translation, and Run
  Instructions — covered by the `separated-fresh-run-delivery` scenario.
- [x] Explicit Fresh Run and English-only copy guidance — required by the
  canonical skill and documented in the README.
- [x] Quality checks for budget, contract, sensitive data, and compatibility —
  required by the canonical skill and static contract.
- [x] Every Acceptance Scenario passes across all three tools — the shared
  matrix and retained smoke records are checked by the cross-tool contract.
- [x] Static validation, documentation, and link checks pass in CI —
  `.github/workflows/cross-tool-contract.yml` runs the release-candidate
  validator without a model invocation.
- [x] README alone makes installation, use, limitations, and contribution
  reproducible — this README is checked by the release-candidate validator.
- [x] Real installation and invocation evidence exists for all three tools —
  retained records: [`codex`](../tests/acceptance/codex-smoke.json),
  [`Claude Code`](../tests/acceptance/claude-smoke.json), and
  [`OpenCode`](../tests/acceptance/opencode-smoke.json).

## Post-acceptance action

After every checked criterion above passes and the release is accepted, the
maintainer may convert the repository to Public and tag `v0.1.0`. Public
conversion is deliberately outside this issue and must not block the candidate
checklist or be performed implicitly.

## Distribution boundary

The release contains independently authored Meta-Prompt product content only.
Matt Pocock skills remain development-only dependencies and are not bundled
into the product distribution.
