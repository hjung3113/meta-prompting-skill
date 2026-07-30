# Autonomous decision log

This log records decisions made after the user approved the remediation goal.
Each entry must remain within the approved issue scope. A protected-constraint
change requires user approval before work continues.

| ID | Date | Scope reference | Decision and rationale | Protected constraints checked |
| --- | --- | --- | --- | --- |
| AD-001 | 2026-07-30 | Goal prompt; issues #21–#28 | Use `docs/remediation/` for the issue map, decision log, evidence, and final report so operational artifacts are versionable and repository-local. | Goal, deliverable, exclusions, acceptance criteria, budget, sensitive-data treatment, and external side effects unchanged. |
| AD-002 | 2026-07-30 | Issue map | Sequence work by shared contracts first (#21, #22, #24), installer behavior (#25, #26), and independent Field Evaluation work (#23, #27), then autonomous-progression semantics (#28). This minimizes conflicting validator edits. | All eight approved deliverables retained; no new workflow implementation. |
