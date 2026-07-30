# Issue #27 evidence

- Issue: [#27](https://github.com/hjung3113/meta-prompting-skill/issues/27)
- Acceptance mapping: the Markdown template is replaced by a GitHub Issue Form
  with required sanitisation and publication-consent checkboxes, required safe
  reporting fields, and the existing feedback routing labels.
- Changed surfaces: Issue Form and Field Evaluation validator.
- Regression coverage: the validator requires both consent control IDs and
  their `required: true` options.
- Required evidence: `node tests/acceptance/validate-field-evaluation.mjs`.
