import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const stateOrder = [
  "first-response", "dump-receipt", "dump-complete", "target-tool",
  "prompt-budget", "clarification-1", "clarification-2", "clarification-3",
  "clarification-4", "clarification-5", "clarification-6", "alignment", "delivery",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const artifact = (text, label) => {
  const labels = /^(?:#{1,6}\s+|\*\*)(English Final Prompt|Review Translation|Run Instructions)(?:\*\*)?\s*$/gim;
  const headings = [...text.matchAll(labels)];
  const index = headings.findIndex((match) => match[1].toLowerCase() === label.toLowerCase());
  assert.notEqual(index, -1, `missing exact ${label} artifact`);
  const start = headings[index].index + headings[index][0].length;
  const end = headings[index + 1]?.index ?? text.length;
  const body = text.slice(start, end);
  assert.notEqual(body.replace(/[\s`]/g, ""), "", `${label} artifact is empty`);
  return body;
};

export function validateEvidence({ transcript, manifest, rawFiles = [] }) {
  assert.equal(manifest.nextIndex, stateOrder.length, "manifest must capture every required state");
  assert.equal(manifest.entries.length, stateOrder.length, "manifest must have 13 raw entries");
  for (const field of ["supportedModel", "captureUtc", "hostVersion", "threadId", "skillSha256", "derivedSha256"]) {
    assert.equal(typeof manifest[field], "string", `missing provenance: ${field}`);
    assert.notEqual(manifest[field], "", `empty provenance: ${field}`);
  }
  assert.match(manifest.supportedModel, /^gpt-[a-z0-9.-]+$/i, "unsupported or missing model provenance");
  assert.ok(Number.isFinite(Date.parse(manifest.captureUtc)) && /Z$/i.test(manifest.captureUtc), "capture timestamp must be UTC ISO-8601");
  assert.match(manifest.hostVersion, /^codex-cli \d+\.\d+\.\d+/, "missing CLI version provenance");
  assert.match(manifest.threadId, /^[0-9a-f-]{36}$/i, "missing thread provenance");
  assert.match(manifest.skillSha256, /^[a-f0-9]{64}$/, "missing skill hash provenance");
  assert.match(manifest.derivedSha256, /^[a-f0-9]{64}$/, "missing derived hash provenance");
  assert.equal(manifest.derivedSha256, sha256(JSON.stringify(transcript, null, 2)), "derived transcript hash mismatch");
  assert.deepEqual(Object.keys(transcript), ["turns"], "derived transcript must contain only turns");
  assert.equal(transcript.turns.length, stateOrder.length, "exact 13-state transcript required");
  for (const [index, turn] of transcript.turns.entries()) {
    assert.deepEqual(Object.keys(turn), ["index", "user", "assistant"], "turns use only {index,user,assistant}");
    assert.equal(turn.index, index, `state order index mismatch at ${stateOrder[index]}`);
    assert.equal(typeof turn.assistant, "string");
    assert.ok(turn.assistant.trim(), `empty assistant response at ${stateOrder[index]}`);
    if (index === 0) assert.equal(turn.user, null);
    else assert.equal(typeof turn.user, "string");
  }
  for (const [index, entry] of manifest.entries.entries()) {
    assert.equal(entry.index, index, "manifest entry order mismatch");
    assert.equal(entry.status, 0, `raw capture failed at ${index}`);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    if (rawFiles.length) assert.equal(entry.sha256, sha256(rawFiles[index]), `raw hash mismatch: ${entry.raw}`);
  }

  const turns = transcript.turns;
  assert.match(turns[0].assistant, /Context Dump/i);
  assert.match(turns[0].assistant, /덤프 끝|dump complete/i);
  assert.match(turns[0].assistant, /receipt|수신 확인/i);
  assert.match(turns[1].assistant, /dump complete|덤프 끝/i);
  assert.doesNotMatch(turns[1].assistant, /plan|design|implement|final prompt/i, "analysis before dump signal");
  assert.match(turns[2].user, /덤프 끝|dump complete/i);
  assert.match(turns[2].assistant, /Target Tool/i);
  assert.match(turns[2].assistant, /recommend|권장/i);
  assert.match(turns[3].assistant, /Prompt Budget/i);
  assert.match(turns[3].assistant, /900\s*(?:English\s+words|words|단어)/i);
  for (const turn of turns.slice(4, 10)) {
    assert.match(turn.assistant, /recommend|권장/i, "each decision needs a recommendation");
    assert.equal((turn.assistant.match(/\?/g) ?? []).length, 1, "one decision at a time");
  }
  const alignment = turns[11];
  assert.match(alignment.assistant, /Alignment Gate/i);
  for (const field of ["Goal", "Deliverable", "scope", "exclusions", "Constraints", "Acceptance Criteria", "Failure", "Remaining assumptions"]) assert.match(alignment.assistant, new RegExp(field, "i"));
  assert.doesNotMatch(alignment.assistant, /\bTBD\b/i, "alignment is incomplete");
  assert.match(alignment.assistant, /approve/i);
  assert.match(turns[12].user, /^approve$/i, "approval must be preserved exactly");
  for (const turn of turns.slice(0, 12)) assert.doesNotMatch(turn.assistant, /English Final Prompt/i, "premature final prompt");
  const delivery = turns[12].assistant;
  const english = artifact(delivery, "English Final Prompt");
  const translation = artifact(delivery, "Review Translation");
  const instructions = artifact(delivery, "Run Instructions");
  assert.ok(delivery.indexOf("English Final Prompt") < delivery.indexOf("Review Translation") && delivery.indexOf("Review Translation") < delivery.indexOf("Run Instructions"), "artifact label order drift");
  assert.match(instructions, /Fresh Run/i);
  assert.match(instructions, /only the English Final Prompt|English Final Prompt\*\*만/i);
  for (const required of ["Node.js", "TypeScript", "add", "list", "remove", "cloud", "URL", "malformed"]) assert.match(english, new RegExp(required, "i"), `English Final Prompt misses ${required}`);
  assert.match(translation, /Node\.js|TypeScript/i, "translation does not render final prompt");
  assert.match(delivery, /Quality Gate:\s*(?:\*\*)?(?:Passed|통과)/i, "Quality Gate did not pass");
  assert.match(instructions, /invalid URL|잘못된 URL/i);
  assert.match(instructions, /missing(?:\/unknown)? ID|없는 ID/i);
  assert.match(instructions, /malformed JSON|손상된 JSON/i);
  return { status: "PASS", observedTurnCount: turns.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const evidence = resolve(directory, "evidence");
  const [transcript, manifest] = await Promise.all(["derived-transcript.json", "manifest.json"].map(async (file) => JSON.parse(await readFile(resolve(evidence, file), "utf8"))));
  const rawFiles = await Promise.all(manifest.entries.map((entry) => readFile(resolve(evidence, "raw", entry.raw))));
  const result = validateEvidence({ transcript, manifest, rawFiles });
  console.log(`observed Codex smoke transcript: ${result.status} (${result.observedTurnCount} turns)`);
}
