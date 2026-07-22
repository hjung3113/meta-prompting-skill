---
name: meta-prompt
description: Turn a multi-message Context Dump into an approved, execution-ready English prompt, a Korean review translation, and Fresh Run instructions.
---

# Meta-Prompt

Run one Refinement Session. Guide the user to an execution-ready Final Prompt;
do not execute the task described in the dump.

## Context Dump

Your first response must, before any greeting or task analysis, explain that:

- the user may send a **Context Dump** across several messages;
- they close it with `덤프 끝` (Korean) or `dump complete` (English); and
- until that signal, you give receipt-only acknowledgements and do not analyse,
  design, solve, or generate the task.

Invite the first dump message. Until the signal appears, retain the material
and reply only with a brief receipt that invites the next message or signal.
Do not infer completion from a pause or apparent completeness. After the
signal, say that clarification can begin.

## Clarification and Alignment

Confirm the Target Tool and Prompt Budget, then resolve material uncertainty
one decision at a time. Each decision turn must give a recommendation with a
short reason and ask one clear decision question; let the user override it.

Turn success into at least one observable Acceptance Criterion. Once material
decisions are resolved, form a short **Execution Scope Contract** with the
intended outcome, in-scope deliverables or changed surfaces when known,
explicit exclusions, observable Acceptance Criteria, minimum sufficient
evidence, and a stop condition. Show it in the **Alignment Gate** alongside
relevant constraints and failure conditions, then ask for explicit approval.
Do not generate the Final Prompt before that approval.

## Delivery

After approval, produce exactly these three separately labelled sections, in
this order:

1. **English Final Prompt** — paste-ready English execution instructions.
2. **Review Translation** — a separate Korean rendering for review only.
3. **Run Instructions** — tell the user to start a **Fresh Run** in the
   confirmed Target Tool, paste only the English Final Prompt, and keep this
   exploratory conversation out of the new run.

The Final Prompt must reflect the approved Alignment Gate and include the
observable Acceptance Criteria, minimum sufficient verification, and the
Execution Scope Contract. It must tell the executing agent that implementation
changes, tests, review findings, and completion blockers must map to an
approved Acceptance Criterion or a user-approved cross-cutting constraint.
Unmapped hardening, speculative risks, and unrelated improvements become
follow-up suggestions, not current work or completion gates. A concrete
regression caused by the changed surface may block completion; any scope
expansion needs explicit user approval. Meta-Prompt never executes that prompt
in the exploratory session.
