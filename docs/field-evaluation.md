# Field Evaluation

Field Evaluation is a development-only, opt-in way to report what happened
after using a Meta-Prompt **English Final Prompt** in a separate project's
Fresh Run. It is not part of a Refinement Session, and it does not change the
normal Final Prompt or Run Instructions.

## When to use it

Use this guide only after the Fresh Run has finished or reached a concrete
blocker. Evaluate one Fresh Run at a time. The result is feedback for
maintainer triage, not a release gate and not a claim that Meta-Prompt caused
the observed result.

## Before you report

Write a short sanitised task summary. Do not include any of the following:

- raw Context Dumps or conversation transcripts;
- credentials, tokens, customer data, or other sensitive values;
- private source, proprietary implementation details, or private paths; or
- the original English Final Prompt when its contents are not safe to publish.

Report only the approved Acceptance Criteria in safe paraphrased form, the
observable result, and the smallest useful explanation. If a needed detail is
not safe to publish, describe its role rather than its value.

## Complete the Field Evaluation Report

Open the repository's **Field Evaluation Report** issue template. Complete all
required sections, review the rendered issue, and submit it only when the user
approves publication. The `feedback` and `needs-triage` labels identify a
submitted report as maintainer input rather than an implementation request.

### Prompt quality

Score each item with `0` (missing or unsafe), `1` (usable but needed material
repair), or `2` (clear and usable as delivered):

- Alignment fidelity: the safe summary reflects the approved goal, scope, and
  exclusions.
- Execution clarity: the Target Tool can identify what to do and which safe
  Context Assets it needs.
- Verifiability: the Final Prompt supplies observable Acceptance Criteria,
  minimum sufficient verification, and a stop condition.

The scores aid discussion; they do not rank tools, models, users, or prompts.

### Execution outcome

Record whether the Fresh Run needed material rework or attempted scope drift.

### Acceptance Criterion outcomes

For each relevant approved criterion, record one result: `met`, `partially
met`, `not met`, `blocked`, or `not applicable`. Add only the observed evidence
needed to explain the result.

### Likely cause

Choose zero or more categories and state confidence as `low`, `medium`, or
`high`. These categories are hypotheses, not causality findings:

- Prompt: the approved instruction was unclear, incomplete, or internally
  inconsistent.
- Target Tool/model: the executing tool or model behaved in a way that changed
  the result.
- Environment or permissions: workspace state, access, unavailable Context
  Assets, or permissions prevented execution.
- Input/context: safe source material or a user decision left a material fact
  unresolved.
- Unknown/mixed: the available evidence cannot isolate one likely cause.

## Maintainer boundary

A Field Evaluation Report may motivate a follow-up issue after triage. It does
not automatically alter the Shared Workflow, create a Tool Adapter, block an
active issue, collect telemetry, call a model, or retain a raw transcript.
