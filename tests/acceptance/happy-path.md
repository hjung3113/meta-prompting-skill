# Issue 2 happy path

This fixture demonstrates one runnable canonical-skill path: teach the
multi-message Context Dump, acknowledge receipt only until `dump complete`,
ask one recommended decision at a time, obtain Alignment Gate approval with
observable Acceptance Criteria, then deliver the three required sections for
a Fresh Run.

Run it with:

```sh
node tests/acceptance/validate-static-contract.mjs
node tests/meta-prompt-contract.test.mjs
node tests/acceptance/validate-observed-transcript.mjs
```
