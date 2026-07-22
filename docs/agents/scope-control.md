# Development scope control

This development-only guide keeps issue work faithful to its approved scope.
It does not change product behavior or the `meta-prompt` skill.

It operationalizes [ADR-0002: Issue scope is an invariant](../adr/0002-issue-scope-is-an-invariant.md).

## Incident cause

“Review until clean” let reviewers redefine “clean” because scope invariance
and a finding-to-criterion mapping gate were missing.

## Mandatory prompt contract

- Bounded issue prompts must explicitly state: (1) the problem and intended
  outcome; (2) in-scope deliverables and allowed changed surfaces or files;
  (3) explicit exclusions and non-goals; (4) minimum sufficient evidence per
  Acceptance Criterion; (5) which findings may block versus become follow-ups;
  and (6) the stop condition when the original criteria are proven.
- The live issue, its dependencies, and explicitly approved Acceptance Criteria
  are the immutable scope authority.
- Every implementation change, test, review finding, and completion blocker
  must map directly to a named criterion or an explicitly authorized
  cross-cutting constraint.
- Reviewers may discover defects but may not create new requirements.
- Unmapped improvements, hardening ideas, speculative risks, and release-level
  invariants must be archived or filed as follow-ups; do not add them to the
  current branch or use them as a gate.
- Evidence must be proportional: use the minimum sufficient to demonstrate the
  criterion, not a new system for defending evidence itself.
- A material regression introduced by the current diff may block only when its
  impact is concrete and within the changed surface.
- Any scope expansion requires explicit user approval.
- Review and remediation may repeat as needed inside this fixed scope and stop
  once the scoped criteria pass.

## Preflight and proportionality

Before work, map every planned artifact and change to a named Acceptance
Criterion. Orphan changes are prohibited unless the user explicitly approves a
scope expansion. Keep solutions proportional: do not create a new subsystem
when a direct check proves the criterion.
