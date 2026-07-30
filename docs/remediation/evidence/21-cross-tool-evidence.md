# Issue #21 evidence

- Issue: [#21](https://github.com/hjung3113/meta-prompting-skill/issues/21)
- Acceptance mapping: `tests/acceptance/tool-scenario-results.json` holds one
  revision-bound result for every 3-tool x 6-scenario pair. Evidence remains
  valid only while the canonical skill, adapters, and scenario fixtures are
  unchanged from its recorded ancestor revision; legacy smoke records preserve
  observations rather than self-declared `PASS:` results.
- Changed surfaces: scenario results, smoke records, adapter validators, and
  `validate-cross-tool-contract.mjs`.
- Regression coverage: the cross-tool validator rejects a stale revision and a
  missing pair before accepting the complete matrix.
- Required evidence: `node tests/acceptance/validate-cross-tool-contract.mjs`.
