# Issue scope is an invariant

For issue work, the live issue, its dependencies, and explicitly approved
Acceptance Criteria form an invariant scope boundary: every implementation
change, test, review finding, and blocker must map to a named criterion or an
explicitly authorized cross-cutting constraint. Unmapped hardening, speculative
risk, and release-level invariants are follow-ups and may not redefine clean;
evidence is the minimum sufficient to prove the scoped criterion, and scope
expansion requires explicit user approval.

Exhaustive reviewer-driven hardening can find real improvements, but it can
replace the product outcome with a validation subsystem. We therefore choose
scope fidelity and proportional evidence, while concrete regressions in the
changed surface remain blockers.
