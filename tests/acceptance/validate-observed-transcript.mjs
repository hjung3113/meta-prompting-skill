import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const labels = ["English Final Prompt", "Review Translation", "Run Instructions"];

export function validateObservedTranscript(turns) {
  assert.match(turns[0].assistant, /Context Dump/i, "first turn teaches the dump");
  assert.match(turns[0].assistant, /덤프 끝|dump complete/i, "first turn teaches completion");
  assert.match(turns[0].assistant, /receipt-only|receipt only/i, "first turn teaches receipt-only behavior");
  assert.match(turns[1].assistant, /received|receipt/i, "open dump gets a receipt");
  assert.doesNotMatch(turns[1].assistant, /plan|design|solution/i, "receipt contains no analysis");
  assert.match(turns[2].user, /dump complete|덤프 끝/i, "dump completes explicitly");
  const decisionTurns = turns.filter((turn) => /Recommendation:/.test(turn.assistant));
  assert.ok(decisionTurns.length >= 1, "a recommendation is offered");
  for (const turn of decisionTurns) {
    assert.equal((turn.assistant.match(/\?/g) ?? []).length, 1, "each turn asks one decision");
  }
  const gate = turns.find((turn) => /Alignment Gate/.test(turn.assistant));
  assert.ok(gate, "Alignment Gate is present");
  assert.match(gate.assistant, /Acceptance Criteria:.*observable/i, "gate has observable acceptance criteria");
  assert.match(gate.assistant, /approve/i, "gate requests approval");
  const delivery = turns.at(-1).assistant;
  assert.deepEqual(labels.map((label) => delivery.indexOf(label)), [...labels.map((label) => delivery.indexOf(label))].sort((a, b) => a - b), "delivery order");
  for (const label of labels) assert.ok(delivery.includes(label), `delivery includes ${label}`);
  assert.match(delivery, /Fresh Run/);
  return { status: "PASS", turnCount: turns.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const transcript = JSON.parse(await readFile(resolve(directory, "observed-happy-path.json"), "utf8"));
  const result = validateObservedTranscript(transcript.turns);
  console.log(`observed happy-path transcript: ${result.status} (${result.turnCount} turns)`);
}
