# Issue #22 evidence

- Issue: [#22](https://github.com/hjung3113/meta-prompting-skill/issues/22)
- Acceptance mapping: `observed-happy-path.json` explicitly confirms a Prompt
  Budget and carries scope, exclusions, concrete Acceptance Criteria,
  verification evidence, and stop condition from the Alignment Gate to the
  English Final Prompt.
- Changed surfaces: the fixture and `validate-observed-transcript.mjs`.
- Regression coverage: the transcript validator requires the budget and every
  approved gate field in delivery.
- Required evidence: `node tests/acceptance/validate-observed-transcript.mjs`
  and the cross-tool contract.
