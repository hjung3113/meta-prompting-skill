# Development scope control

This development-only guide bounds issue implementation and review work. It
does not change product behavior or the `meta-prompt` skill.

## Incident cause

The evidence-system overbuild came from unbounded “review until clean” wording,
no definition of a material blocker, no iteration or token stop rule,
release-level invariants applied to one issue, and reviewers creating new
requirements.

## Mandatory prompt contract

- The live issue and its approved acceptance criteria are the scope authority.
- Only a direct acceptance failure, security or data-loss defect, or false or
  unrunnable claimed evidence can block completion. All other findings become
  follow-ups.
- Default per issue: one Terra implementation, one Sol review, and at most one
  Terra remediation.
- Any extra review loop, parallel reviewer, adversarial expansion, or new
  acceptance requirement needs explicit user approval.
- The coordinator must set a bounded task contract and stop when the approved
  criteria pass.
