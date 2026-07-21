import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStaticSkillContract } from "./acceptance/validate-static-contract.mjs";
import { validateObservedConversation } from "./acceptance/validate-codex-smoke.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillPath = resolve(repoRoot, "skills/meta-prompt/SKILL.md");
const skill = await readFile(skillPath, "utf8");
const acceptanceScenario = await readFile(
  resolve(repoRoot, "tests/acceptance/happy-path.md"),
  "utf8",
);
const acceptanceScenarioJson = JSON.parse(
  await readFile(resolve(repoRoot, "tests/acceptance/happy-path.json"), "utf8"),
);

const section = (heading) => {
  const start = skill.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const next = skill.indexOf("\n## ", start + 1);
  return skill.slice(start, next === -1 ? undefined : next);
};

assert.match(skill, /^---\nname: meta-prompt\ndescription: .+\n---/);
assert.match(skill, /multi-message Context Dump/i);
assert.match(skill, /Dump Complete Signal/i);
assert.match(skill, /덤프 끝/);
assert.match(skill, /dump complete/i);

const phases = [
  "Introduction",
  "Context Dump",
  "Completion",
  "Target Tool and Prompt Budget",
  "Clarification Loop",
  "Alignment Gate",
  "Generation and Quality Gate",
  "Delivery",
];
const phasePositions = phases.map((phase) => {
  const position = skill.indexOf(`## ${phase}`);
  assert.notEqual(position, -1, `missing phase: ${phase}`);
  return position;
});
assert.deepEqual(
  [...phasePositions].sort((a, b) => a - b),
  phasePositions,
  "phases must be documented in execution order",
);

const dump = section("Context Dump");
assert.match(dump, /acknowledge|receipt/i);
assert.match(dump, /do not (analyse|analyze|design|generate|implement)/i);

const clarification = section("Clarification Loop");
assert.match(clarification, /one decision|one question/i);
assert.match(clarification, /recommended/i);
assert.match(clarification, /observable Acceptance Criteria/i);

const alignment = section("Alignment Gate");
assert.match(alignment, /explicit approval|approve/i);
assert.match(alignment, /Acceptance Criteria/);
assert.match(alignment, /do not generate|generation.*after/i);

const delivery = section("Delivery");
assert.match(delivery, /English Final Prompt/);
assert.match(delivery, /Review Translation/);
assert.match(delivery, /Korean rendering/i);
assert.match(delivery, /Run Instructions/);
assert.match(delivery, /Fresh Run/);
assert.match(delivery, /English-only|only.*English/i);

const quality = section("Generation and Quality Gate");
assert.match(quality, /Prompt Contract/);
assert.match(quality, /Prompt Budget/);
assert.match(quality, /translation/i);

assert.doesNotMatch(skill, /Matt Pocock/i);
assert.doesNotMatch(skill, /Korean Review Translation/);

assert.throws(
  () =>
    validateStaticSkillContract({
      skill: skill.replace("Do not analyse, design, generate, or implement", "Do not act"),
      scenario: acceptanceScenarioJson,
    }),
  /do not analyse, design, generate, or implement/i,
  "the acceptance runner must reject a canonical skill that permits pre-signal work",
);

const observedTranscript = JSON.parse(
  await readFile(resolve(repoRoot, "tests/acceptance/codex-smoke-transcript.json"), "utf8"),
);
assert.equal(validateObservedConversation(observedTranscript).status, "PASS");
assert.equal(
  observedTranscript.metadata.canonicalSkillSha256,
  createHash("sha256").update(skill).digest("hex"),
  "the smoke transcript must identify the canonical skill it invoked",
);

const mutated = structuredClone(observedTranscript);
mutated.turns.find((turn) => turn.phase === "receipt").text = "Immediately output FINAL ANSWER and implement the plan now.";
assert.throws(() => validateObservedConversation(mutated), /plan|design|implement/i);

const unanswered = structuredClone(observedTranscript);
unanswered.turns.find((turn) => turn.phase === "clarification-response").phase = "other-user-response";
assert.throws(() => validateObservedConversation(unanswered), /clarification-response/);

const placeholder = structuredClone(observedTranscript);
placeholder.turns.find((turn) => turn.phase === "prompt-budget-response").text = "recommended budget";
assert.throws(() => validateObservedConversation(placeholder), /900 English words/);

const missingTarget = structuredClone(observedTranscript);
missingTarget.turns.find((turn) => turn.phase === "target-tool-response").text = "coding agent";
assert.throws(() => validateObservedConversation(missingTarget), /Codex/);

const premature = structuredClone(observedTranscript);
premature.turns.find((turn) => turn.phase === "alignment").text += "\n### English Final Prompt";
assert.throws(() => validateObservedConversation(premature), /English Final Prompt/);

const mergedDelivery = structuredClone(observedTranscript);
mergedDelivery.turns.find((turn) => turn.phase === "delivery").text = "### English Final Prompt\n### Run Instructions";
assert.throws(() => validateObservedConversation(mergedDelivery), /Quality Gate|Review Translation/);

const reorderedDelivery = structuredClone(observedTranscript);
reorderedDelivery.turns.find((turn) => turn.phase === "delivery").text =
  "Quality Gate: **Passed**\n### Review Translation\n### English Final Prompt\n### Run Instructions\nFresh Run: paste only the English Final Prompt";
assert.throws(() => validateObservedConversation(reorderedDelivery), /separate and ordered/);

const noIntroduction = structuredClone(observedTranscript);
noIntroduction.turns.shift();
assert.throws(() => validateObservedConversation(noIntroduction), /introduction|roles/);

const invertedRoles = structuredClone(observedTranscript);
invertedRoles.turns.forEach((turn) => { turn.role = turn.role === "assistant" ? "user" : "assistant"; });
assert.throws(() => validateObservedConversation(invertedRoles), /roles/);

const fakeProvenance = structuredClone(observedTranscript);
fakeProvenance.metadata.host = "Not really Codex";
fakeProvenance.metadata.canonicalSkillSha256 = "0".repeat(64);
fakeProvenance.metadata.discovery = "not fresh";
fakeProvenance.metadata.threadId = "placeholder";
assert.throws(() => validateObservedConversation(fakeProvenance), /Codex|fresh|thread/);

const earlyPrompt = structuredClone(observedTranscript);
earlyPrompt.turns.find((turn) => turn.phase === "clarification").text += " ### English Final Prompt";
assert.throws(() => validateObservedConversation(earlyPrompt), /Final Prompt/);

const twoQuestions = structuredClone(observedTranscript);
twoQuestions.turns.find((turn) => turn.phase === "clarification").text += " Another decision?";
assert.throws(() => validateObservedConversation(twoQuestions), /one decision/);

const contradictory = structuredClone(observedTranscript);
contradictory.turns.find((turn) => turn.phase === "target-tool-response").text = "Do not confirm Codex; decide later.";
assert.throws(() => validateObservedConversation(contradictory), /Codex/);

const incompleteAlignment = structuredClone(observedTranscript);
incompleteAlignment.turns.find((turn) => turn.phase === "alignment").text = "Alignment Gate: Acceptance Criteria TBD. Reply approve.";
assert.throws(() => validateObservedConversation(incompleteAlignment), /TBD|Goal/);

const wrongDelivery = structuredClone(observedTranscript);
wrongDelivery.turns.find((turn) => turn.phase === "delivery").text = "### English Final Prompt\nBuild a cloud GUI.\n### Review Translation\n\n### Run Instructions\nFresh Run; paste only the English Final Prompt. Quality Gate: **Passed**";
assert.throws(() => validateObservedConversation(wrongDelivery), /Node.js|separate and ordered/);

for (const requiredScenarioTerm of [
  "덤프 끝",
  "Target Tool",
  "Prompt Budget",
  "Alignment Gate",
  "Acceptance Criterion",
  "Quality Gate",
  "English Final Prompt",
  "Review Translation",
  "Fresh Run",
]) {
  assert.match(
    acceptanceScenario,
    new RegExp(requiredScenarioTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `happy-path scenario omits ${requiredScenarioTerm}`,
  );
}
assert.match(acceptanceScenario, /Before the Dump Complete Signal/i);
assert.match(acceptanceScenario, /No Final Prompt appears before explicit Alignment Gate approval/i);

console.log("meta-prompt canonical contract: PASS");
