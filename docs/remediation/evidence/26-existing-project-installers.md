# Issue #26 evidence

- Issue: [#26](https://github.com/hjung3113/meta-prompting-skill/issues/26)
- Acceptance mapping: each direct installer rejects a nonexistent project
  directory with exit code 66 before `mkdir -p` can create artifacts.
- Changed surfaces: three adapter installers and cross-tool installer contract.
- Regression coverage: the contract invokes every installer with a typo path
  and proves that project path is still absent.
- Required evidence: `node tests/acceptance/validate-cross-tool-contract.mjs`.
