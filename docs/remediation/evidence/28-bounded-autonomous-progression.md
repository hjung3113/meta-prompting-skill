# Issue #28 evidence

- Issue: [#28](https://github.com/hjung3113/meta-prompting-skill/issues/28)
- Acceptance mapping: the canonical workflow permits agents and subagents to
  proceed only after Alignment Gate approval, requires a repository-local
  decision log, and enumerates protected changes requiring user approval.
- Changed surfaces: canonical skill and static contract.
- Regression coverage: the static contract requires the autonomous scope,
  decision-log reference, and protected constraints.
- Required evidence: `node tests/acceptance/validate-static-contract.mjs` and
  the cross-tool contract.
