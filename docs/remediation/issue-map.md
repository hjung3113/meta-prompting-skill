# Meta-Prompting remediation issue map

This map is the authoritative execution order for the approved remediation goal.
It was created on 2026-07-30 from the explicit eight-item remediation prompt.

| Order | Issue | Scope | Depends on |
| --- | --- | --- | --- |
| 1 | [#21](https://github.com/hjung3113/meta-prompting-skill/issues/21) | Revision-bound 3-tool x 6-scenario evidence | — |
| 2 | [#22](https://github.com/hjung3113/meta-prompting-skill/issues/22) | Happy-path prompt-contract semantics | #21 evidence schema |
| 3 | [#24](https://github.com/hjung3113/meta-prompting-skill/issues/24) | Exact normalized Context Dump completion | #22 transcript coverage |
| 4 | [#25](https://github.com/hjung3113/meta-prompting-skill/issues/25) | Atomic unified installer | #21 contract coverage |
| 5 | [#26](https://github.com/hjung3113/meta-prompting-skill/issues/26) | Existing-directory per-tool installers | #25 installer checks |
| 6 | [#23](https://github.com/hjung3113/meta-prompting-skill/issues/23) | Independent Field Evaluation CI signal | — |
| 7 | [#27](https://github.com/hjung3113/meta-prompting-skill/issues/27) | Field Evaluation Issue Form consent and sanitisation | #23 independent validation |
| 8 | [#28](https://github.com/hjung3113/meta-prompting-skill/issues/28) | Bounded autonomous progression | #22 prompt-contract coverage |

## Guardrails

- No issue may add requirements outside its GitHub acceptance criteria.
- Each implementation, test, documentation change, and review finding must be
  recorded in its evidence file under `docs/remediation/evidence/`.
- The untracked repository-root `HANDOFF.md` is user-owned and excluded from
  all changes.
