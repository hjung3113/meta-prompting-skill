# Issue #24 evidence

- Issue: [#24](https://github.com/hjung3113/meta-prompting-skill/issues/24)
- Acceptance mapping: the canonical skill defines an entire-normalized-message
  rule for `덤프 끝` and `dump complete`.
- Changed surfaces: canonical skill, static contract, transcript validator.
- Regression coverage: the transcript validator rejects embedded and quoted
  English completion strings while accepting normalized exact signals.
- Required evidence: observed-transcript, static-contract, and cross-tool
  validators.
