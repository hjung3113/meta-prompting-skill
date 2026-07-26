---
name: Field Evaluation Report
about: Report one sanitised Meta-Prompt Fresh Run for maintainer triage
title: "[Field Evaluation] "
labels: ["feedback", "needs-triage"]
assignees: ""
---

## Sanitised task and run context

Describe the task and Fresh Run using safe paraphrases only. Optionally name
the Target Tool and version when safe.

<!-- Do not include raw Context Dumps, credentials, private source, private
paths, customer data, or sensitive Final Prompt values. -->

## Prompt quality

Score each item: `0` missing or unsafe, `1` usable but needed material repair,
or `2` clear and usable as delivered.

- Alignment fidelity:
- Execution clarity:
- Verifiability:

## Execution outcome

State whether material rework or scope drift occurred, then record the outcome
for every relevant approved criterion: `met`, `partially met`, `not met`,
`blocked`, or `not applicable`.

## Acceptance Criterion outcomes

| Safe paraphrase of approved criterion | Outcome | Minimum observed evidence |
| --- | --- | --- |
|  |  |  |

## Likely cause

Select zero or more: Prompt; Target Tool/model; Environment or permissions;
Input/context; Unknown/mixed. State confidence (`low`, `medium`, or `high`) and
why this is a hypothesis rather than a causality finding.

## Publication confirmation

- [ ] I confirm this report is sanitised and contains no raw Context Dump,
  sensitive value, credential, private source, or private path.
- [ ] I approve publication of this Field Evaluation Report for maintainer
  triage.
