import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));

const byPhase = (turns, phase) => turns.filter((turn) => turn.phase === phase);
const one = (turns, phase) => {
  const matches = byPhase(turns, phase);
  assert.equal(matches.length, 1, `expected one ${phase} turn`);
  return matches[0];
};

export function validateObservedConversation(transcript) {
  const { metadata, turns, approvedState } = transcript;
  assert.match(metadata.host, /Codex/i);
  assert.match(metadata.hostVersion, /codex-cli \d+\.\d+\.\d+/);
  assert.equal(metadata.canonicalSkillPath, "skills/meta-prompt/SKILL.md");
  assert.match(metadata.canonicalSkillSha256, /^[a-f0-9]{64}$/);
  assert.match(metadata.discovery, /fresh temporary git project/i);
  assert.match(metadata.command, /^codex exec .*\$meta-prompt/);
  assert.match(metadata.threadId, /^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  assert.equal(metadata.result, "PASS");
  assert.equal(turns[0].phase, "introduction");
  for (let index = 0; index < turns.length; index += 1) {
    assert.equal(turns[index].role, index % 2 === 0 ? "assistant" : "user", "roles must alternate");
  }
  for (const field of Object.keys(approvedState)) {
    assert.notEqual(approvedState[field], "", `approved field ${field} is required`);
    assert.doesNotMatch(approvedState[field], /\bTBD\b/i);
  }

  const receipt = one(turns, "receipt");
  assert.match(receipt.text, /덤프 끝|dump complete/i);
  assert.doesNotMatch(receipt.text, /plan|design|implement|final prompt/i);

  const target = one(turns, "target-tool");
  assert.match(target.text, /Codex/i);
  assert.match(target.text, /recommend|권장/i);
  assert.doesNotMatch(target.text, /900 English words/i);
  const targetIndex = turns.indexOf(target);
  assert.equal(turns[targetIndex + 1].phase, "target-tool-response");
  assert.match(turns[targetIndex + 1].text, /Codex/);
  assert.doesNotMatch(turns[targetIndex + 1].text, /do not confirm|later/i);

  const budget = one(turns, "prompt-budget");
  assert.match(budget.text, /900 English words/i);
  assert.match(budget.text, /recommend|권장/i);
  const budgetIndex = turns.indexOf(budget);
  assert.equal(turns[budgetIndex + 1].phase, "prompt-budget-response");
  assert.match(turns[budgetIndex + 1].text, /900 English words/i);
  assert.doesNotMatch(turns[budgetIndex + 1].text, /do not confirm|later/i);

  const clarifications = byPhase(turns, "clarification");
  assert.ok(clarifications.length >= 1, "requires a clarification turn");
  for (const question of clarifications) {
    assert.match(question.text, /recommend|권장/i);
    assert.match(question.text, /\?/);
    assert.equal((question.text.match(/\?/g) ?? []).length, 1, "one decision per turn");
    assert.equal(turns[turns.indexOf(question) + 1].phase, "clarification-response");
  }

  const alignment = one(turns, "alignment");
  assert.match(alignment.text, /Alignment Gate/i);
  assert.match(alignment.text, /Acceptance Criter/i);
  assert.match(alignment.text, /approve/i);
  assert.doesNotMatch(alignment.text, /### English Final Prompt/i);
  for (const field of ["Goal", "Deliverable", "scope", "exclusions", "Constraints", "Acceptance Criteria", "Failure", "Remaining assumptions"]) {
    assert.match(alignment.text, new RegExp(field, "i"));
  }
  const alignmentIndex = turns.indexOf(alignment);
  assert.equal(turns[alignmentIndex + 1].phase, "alignment-approval");
  assert.match(turns[alignmentIndex + 1].text, /^approve$/i);

  const delivery = one(turns, "delivery");
  assert.match(delivery.text, /Quality Gate:\s*\*\*Passed\*\*/i);
  const english = delivery.text.indexOf("### English Final Prompt");
  const translation = delivery.text.indexOf("### Review Translation");
  const runInstructions = delivery.text.indexOf("### Run Instructions");
  assert.ok(
    english >= 0 && english < translation && translation < runInstructions,
    "delivery artifacts must be separate and ordered",
  );
  assert.match(delivery.text, /Fresh Run/i);
  assert.match(delivery.text, /only the English Final Prompt/i);
  for (const turn of turns.slice(0, alignmentIndex + 1)) {
    assert.doesNotMatch(turn.text, /### English Final Prompt/i, "Final Prompt cannot precede approval");
  }
  for (const required of ["Node.js", "TypeScript", "add", "list", "remove", "cloud", "URL", "malformed"]) {
    assert.match(delivery.text, new RegExp(required, "i"), `delivery must preserve ${required}`);
  }
  assert.match(delivery.text, /ID disappears.*JSON reflects/i);
  return { status: "PASS", observedTurnCount: turns.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const transcript = JSON.parse(
    await readFile(resolve(directory, "codex-smoke-transcript.json"), "utf8"),
  );
  const result = validateObservedConversation(transcript);
  console.log(`observed Codex smoke transcript: ${result.status} (${result.observedTurnCount} turns)`);
}
