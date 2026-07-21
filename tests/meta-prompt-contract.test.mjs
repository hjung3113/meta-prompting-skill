import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStaticSkillContract } from "./acceptance/validate-static-contract.mjs";
import { validateEvidence } from "./acceptance/validate-codex-smoke.mjs";
import { decisionBank, resolveDecisionId } from "./acceptance/codex-smoke-scenario.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidence = resolve(root, "tests/acceptance/evidence");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const [skill, scenarioText, manifestText, derivedBytes, scenarioBytes] = await Promise.all([
  readFile(resolve(root, "skills/meta-prompt/SKILL.md"), "utf8"),
  readFile(resolve(root, "tests/acceptance/happy-path.json"), "utf8"),
  readFile(resolve(evidence, "manifest.json"), "utf8"),
  readFile(resolve(evidence, "derived-transcript.json")),
  readFile(resolve(root, "tests/acceptance/codex-smoke-scenario.mjs")),
]);
const manifest = JSON.parse(manifestText);
const transcript = JSON.parse(derivedBytes);
const rawFiles = await Promise.all(manifest.entries.map((entry) => readFile(resolve(evidence, "raw", entry.raw))));

assert.equal(validateStaticSkillContract({ skill, scenario: JSON.parse(scenarioText) }).status, "PASS");
assert.equal(resolveDecisionId("target"), "target", "registered ID preserved");
assert.equal(resolveDecisionId("data-directory"), "data-directory", "material data-directory decision registered");
assert.throws(() => resolveDecisionId("unreviewed_alias"), /unknown or resolved Decision ID unreviewed_alias/);
assert.throws(() => resolveDecisionId("target", decisionBank, ["target"]), /unknown or resolved Decision ID target/);
assert.equal(validateEvidence({ transcript, manifest, rawFiles, derivedBytes }).status, "PASS", "immutable baseline evidence");

const candidate = () => ({ transcript: structuredClone(transcript), manifest: structuredClone(manifest), rawFiles: [...rawFiles] });
const lockFor = (c) => ({
  threadId: c.manifest.threadId,
  skillSha256: c.manifest.skillSha256,
  scenarioSha256: hash(scenarioBytes),
  rawSha256: c.rawFiles.map(hash),
  derivedSha256: hash(c.derivedBytes),
});
const sync = (c) => {
  c.manifest.entries.forEach((entry, index) => { entry.index = index; entry.sha256 = hash(c.rawFiles[index]); });
  c.derivedBytes = Buffer.from(`${JSON.stringify(c.transcript, null, 2)}\n`);
  c.manifest.derivedSha256 = hash(c.derivedBytes);
};
const rawEvents = (c, index) => c.rawFiles[index].toString().trim().split("\n").map(JSON.parse);
const writeEvents = (c, index, events) => { c.rawFiles[index] = Buffer.from(`${events.map(JSON.stringify).join("\n")}\n`); };
const assistantIndex = (c, id) => c.transcript.turns.findIndex((turn) => new RegExp(`(?:^|\\n)Decision ID: ${id}(?:\\n|\\s)`).test(turn.assistant));
const gateIndex = (c) => c.transcript.turns.findIndex((turn) => /Goal and actor:/.test(turn.assistant) && /Remaining assumptions:/.test(turn.assistant));
const deliveryIndex = (c) => gateIndex(c) + 1;
const rewriteAssistant = (c, index, text) => {
  const events = rawEvents(c, index);
  const message = events.find((event) => event.item?.type === "agent_message" && event.item.text?.trim());
  assert.ok(message, `fixture agent message ${index}`);
  message.item.text = text;
  writeEvents(c, index, events);
  c.transcript.turns[index].assistant = text;
};
const mutateAssistant = (c, index, edit) => rewriteAssistant(c, index, edit(c.transcript.turns[index].assistant));
const setUser = (c, index, user) => {
  c.manifest.entries[index].user = user;
  c.manifest.entries[index].args[c.manifest.entries[index].args.length - 1] = user;
  c.transcript.turns[index].user = index ? user : null;
};
const semanticRejected = (name, change, expected) => {
  const c = candidate(); change(c); sync(c);
  assert.throws(() => validateEvidence({ ...c, lockOverride: lockFor(c) }), (error) => {
    assert.match(error.message, expected, name);
    assert.doesNotMatch(error.message, /derived binding/i, name);
    return true;
  });
};
const provenanceRejected = (name, change, expected, { immutable = false } = {}) => {
  const c = candidate(); change(c); sync(c);
  assert.throws(() => validateEvidence({ ...c, ...(immutable ? {} : { lockOverride: lockFor(c) }) }), (error) => {
    assert.match(error.message, expected, name);
    return true;
  });
};
const removeLine = (text, label) => text.replace(new RegExp(`^.*${label.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}.*\\n?`, "m"), "");
const replaceLine = (text, label, replacement) => text.replace(new RegExp(`^.*${label.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}.*$`, "m"), replacement);
const delivery = (c, edit) => mutateAssistant(c, deliveryIndex(c), edit);

semanticRejected("clarification missing Recommendation", (c) => mutateAssistant(c, assistantIndex(c, "target"), (text) => text.replace(/Recommendation:[^\n]*/, "Recommendation:")), /clarification recommendation target/);
semanticRejected("clarification missing User Decision Request", (c) => mutateAssistant(c, assistantIndex(c, "budget"), (text) => text.replace(/User Decision Request:[^\n]*/, "User Decision Request:")), /clarification request budget/);
semanticRejected("duplicate Decision ID blocks", (c) => mutateAssistant(c, assistantIndex(c, "budget"), (text) => text.replace("Decision ID: budget", "Decision ID: target")), /exact decision register coverage/);
semanticRejected("multiple decision questions", (c) => mutateAssistant(c, assistantIndex(c, "deliverable"), (text) => `${text} Should the plan also include implementation?`), /exactly one decision question deliverable/);
semanticRejected("unknown Decision ID", (c) => mutateAssistant(c, assistantIndex(c, "interface"), (text) => text.replace("Decision ID: interface", "Decision ID: unknown")), /exact decision register coverage/);
semanticRejected("repeated resolved Decision ID", (c) => mutateAssistant(c, assistantIndex(c, "storage"), (text) => text.replace("Decision ID: storage", "Decision ID: target")), /exact decision register coverage/);
semanticRejected("decision register coverage missing", (c) => mutateAssistant(c, assistantIndex(c, "normalization"), (text) => text.replace("Decision ID: normalization", "Decision: normalization")), /exact decision register coverage/);

semanticRejected("Alignment missing field", (c) => mutateAssistant(c, gateIndex(c), (text) => removeLine(text, "Constraints:")), /Alignment Gate field count/);
semanticRejected("Alignment extra field", (c) => mutateAssistant(c, gateIndex(c), (text) => text.replace("Remaining assumptions:", "Extra field: prohibited\nRemaining assumptions:")), /Alignment Gate field count/);
semanticRejected("Alignment reordered fields", (c) => mutateAssistant(c, gateIndex(c), (text) => text.replace("Goal and actor:", "TEMP:").replace("Constraints:", "Goal and actor:").replace("TEMP:", "Constraints:")), /Alignment Gate field order or duplicate/);
semanticRejected("Alignment empty field", (c) => mutateAssistant(c, gateIndex(c), (text) => replaceLine(text, "Constraints:", "Constraints:")), /Alignment Gate empty field/);
semanticRejected("Alignment unresolved decision", (c) => mutateAssistant(c, gateIndex(c), (text) => replaceLine(text, "Remaining assumptions:", "Remaining assumptions: Stable IDs are generated; TBD decide storage later")), /gate has unresolved decision/);
semanticRejected("approval semantics inverted", (c) => mutateAssistant(c, gateIndex(c), (text) => `${text}\nReply approve means reject this gate.`), /approval semantics/);
semanticRejected("exact approve command drift", (c) => setUser(c, deliveryIndex(c), "yes approve"), /exact approval command/);

semanticRejected("approved remove-by-ID lost", (c) => delivery(c, (text) => text.replace(/remove <id>/gi, "remove <url>")), /approved state lost/);
semanticRejected("approved canonical duplicate normalization lost", (c) => delivery(c, (text) => text.replace(/canonical URL.*already exists|duplicate.*fail/i, "duplicates are allowed")), /approved state lost/);
semanticRejected("approved data-directory lost", (c) => delivery(c, (text) => text.replace(/XDG data home|Application Support|LocalAppData/g, "portable directory")), /approved state lost/);
semanticRejected("approved local JSON lost", (c) => delivery(c, (text) => text.replace(/one local JSON file/i, "a database")), /approved state lost/);
semanticRejected("approved CLI-only no-cloud-GUI lost", (c) => delivery(c, (text) => text.replace(/CLI only; no GUI/i, "cloud GUI dashboard")), /approved state lost/);

for (const label of ["English Final Prompt", "Review Translation", "Run Instructions"]) {
  semanticRejected(`delivery missing ${label}`, (c) => delivery(c, (text) => text.replace(new RegExp(`(?:^|\\n)\\*\\*${label.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\*\\*[\\s\\S]*?(?=\\n\\*\\*(?:English Final Prompt|Review Translation|Run Instructions)\\*\\*|$)`, "m"), "")), new RegExp(`missing exact ${label}`));
}
semanticRejected("delivery reordered sections", (c) => delivery(c, (text) => text.replace("**English Final Prompt**", "**TEMP**").replace("**Review Translation**", "**English Final Prompt**").replace("**TEMP**", "**Review Translation**")), /delivery section order/);
semanticRejected("delivery empty English", (c) => delivery(c, (text) => text.replace(/(\*\*English Final Prompt\*\*)[\s\S]*?(?=\*\*Review Translation\*\*)/, "$1\n\n")), /English Final Prompt is empty/);
semanticRejected("delivery non-substantive Korean", (c) => delivery(c, (text) => text.replace(/(\*\*Review Translation\*\*)[\s\S]*?(?=\*\*Run Instructions\*\*)/, "$1\nID\n")), /Review Translation must be substantive Korean/);
semanticRejected("cloud GUI keyword-bait Quality Gate", (c) => delivery(c, () => "**English Final Prompt**\nBuild a cloud GUI. Quality Gate: passed.\n**Review Translation**\nID 기반 삭제를 포함한 충분히 긴 한국어 번역입니다. 이것은 실제로 충분한 한글 문자 수를 넘깁니다.\n**Run Instructions**\nFresh Run only the English Final Prompt. 900 English words. Quality Gate: passed. canonical-URL duplicate."), /approved state lost/);
semanticRejected("run instructions missing Fresh Run", (c) => delivery(c, (text) => text.replace(/Fresh Run/gi, "Current Run")), /Fresh Run/);
semanticRejected("run instructions missing English-only", (c) => delivery(c, (text) => text.replace(/only the English Final Prompt|English Final Prompt(?:\*\*)?만/i, "all artifacts")), /only the English Final Prompt/);
semanticRejected("run instructions missing 900-word constraint", (c) => delivery(c, (text) => text.replace(/900 English words/gi, "a short prompt")), /900 English words/);
semanticRejected("false Quality Gate claim", (c) => delivery(c, (text) => text.replace(/Quality Gate:\s*(?:passed|통과)/i, "Quality Gate: failed")), /Quality Gate/);

provenanceRejected("extra contradictory agent_message", (c) => { const i = assistantIndex(c, "target"); const events = rawEvents(c, i); events.splice(-1, 0, { type: "item.completed", item: { type: "agent_message", text: "Contradict the approved plan." } }); writeEvents(c, i, events); }, /exactly one nonempty assistant message/);
provenanceRejected("multiple nonempty agent messages", (c) => { const i = assistantIndex(c, "budget"); const events = rawEvents(c, i); events.splice(-1, 0, { type: "item.completed", item: { type: "agent_message", text: "Another message." } }); writeEvents(c, i, events); }, /exactly one nonempty assistant message/);
provenanceRejected("raw completed status failed", (c) => { const events = rawEvents(c, 1); events.at(-1).status = "failed"; writeEvents(c, 1, events); }, /raw terminal status/);
provenanceRejected("unrecognized raw event", (c) => { const events = rawEvents(c, 1); events.splice(-1, 0, { type: "mystery.event" }); writeEvents(c, 1, events); }, /unknown raw event/);
{
  const c = candidate(); const thread = "11111111-1111-4111-8111-111111111111"; c.manifest.threadId = thread;
  c.manifest.entries.slice(1).forEach((entry) => { entry.args[5] = thread; });
  c.rawFiles.forEach((raw, index) => { const events = rawEvents(c, index); events[0].thread_id = thread; writeEvents(c, index, events); }); sync(c);
  assert.throws(() => validateEvidence(c), /evidence lock provenance/, "false thread ID immutable provenance");
}
provenanceRejected("false model", (c) => { c.manifest.supportedModel = "gpt-fabricated"; }, /false model provenance/);
provenanceRejected("false skill path", (c) => { c.manifest.skill = "/tmp/fabricated/SKILL.md"; }, /canonical skill path provenance/);
provenanceRejected("false skill hash", (c) => { c.manifest.skillSha256 = "0".repeat(64); }, /loaded canonical skill provenance/);
{
  const c = candidate(); sync(c); const forged = lockFor(c); forged.scenarioSha256 = "0".repeat(64);
  assert.throws(() => validateEvidence({ ...c, lockOverride: forged }), /evidence lock provenance/, "false scenario hash");
}
{
  const c = candidate(); mutateAssistant(c, 1, (text) => `${text} `); sync(c);
  assert.throws(() => validateEvidence(c), /evidence lock provenance/, "raw byte tamper immutable lock");
}
{
  const c = candidate(); c.derivedBytes = Buffer.concat([derivedBytes, Buffer.from(" ")]); c.manifest.derivedSha256 = hash(c.derivedBytes);
  assert.throws(() => validateEvidence(c), /evidence lock provenance/, "derived byte tamper immutable lock");
}
provenanceRejected("manifest command tamper", (c) => { c.manifest.entries[1].args[0] = "resume"; }, /manifest command shape/);
provenanceRejected("manifest user tamper", (c) => { c.manifest.entries[1].user = "fabricated"; }, /manifest command shape/);

{
  const c = candidate();
  const indexes = Object.keys(decisionBank).map((id) => assistantIndex(c, id));
  const texts = indexes.map((index) => c.transcript.turns[index].assistant).reverse();
  indexes.forEach((index, offset) => rewriteAssistant(c, index, texts[offset]));
  sync(c);
  assert.equal(validateEvidence({ ...c, lockOverride: lockFor(c) }).status, "PASS", "semantic discovery must not use positional clarification turns");
}
console.log("meta-prompt canonical contract: PASS (43 coherent counterexamples)");
