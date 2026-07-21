# Happy-path Acceptance Scenario: one portable Refinement Session

This scenario is an inspectable conversation contract for the canonical
`meta-prompt` skill. It checks observable outcomes, not exact model wording.
Run it in any host that can invoke the canonical skill; the host may be
different from the Target Tool.

## Given

- The host invokes `meta-prompt` in a new conversation.
- The user speaks Korean.
- The user chooses a coding-agent Target Tool and accepts the recommended
  Prompt Budget.

## When

Run the structured conversation in [`happy-path.json`](./happy-path.json)
through the canonical skill; the dump closes with the explicit `덤프 끝`
Dump Complete Signal. The scenario intentionally includes two
clarification turns, a Target Tool and Prompt Budget response, explicit
Alignment Gate approval, and a Quality Gate before delivery.

The model-free acceptance runner invokes the canonical skill contract and
rejects any missing, reordered, or pre-gate event:

```sh
node tests/acceptance/run-happy-path.mjs
```

## Then

- Before the Dump Complete Signal, no analysis, design, solution,
  implementation, or generation appears; only receipt acknowledgements appear.
- No Final Prompt appears before explicit Alignment Gate approval.
- Delivery contains three separate artifacts in order: English Final Prompt,
  Review Translation, and Run Instructions.
- Run Instructions say to start a Fresh Run in the confirmed Target Tool and to
  copy only the English Final Prompt; the Korean translation is explicitly
  review-only.
- Run Instructions report the Prompt Budget and Quality Gate result and map a
  success check to the Acceptance Criterion.
- The generated English Final Prompt contains execution instructions only and
  does not include the exploratory transcript.
