# Issue #25 evidence

- Issue: [#25](https://github.com/hjung3113/meta-prompting-skill/issues/25)
- Acceptance mapping: `skills.sh` preflights all link paths and ancestor
  directories, tracks only links it creates, and rolls those back on failure.
- Changed surfaces: unified installer and cross-tool installer contract.
- Regression coverage: the contract creates a `.claude` file conflict and
  verifies no Codex, Claude Code, or OpenCode link is left behind.
- Required evidence: `node tests/acceptance/validate-cross-tool-contract.mjs`.
