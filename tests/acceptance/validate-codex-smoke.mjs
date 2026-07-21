import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootstrapTurns, decisionBank, supportedModel } from "./codex-smoke-scenario.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const labels = ["English Final Prompt", "Review Translation", "Run Instructions"];
const section = (text, label) => {
  const heads = [...text.matchAll(/^(?:#{1,6}\s+|\*\*)(English Final Prompt|Review Translation|Run Instructions)(?:\*\*)?\s*$/gim)];
  const index = heads.findIndex((h) => h[1] === label); assert.notEqual(index, -1, `missing exact ${label}`);
  const body = text.slice(heads[index].index + heads[index][0].length, heads[index + 1]?.index ?? text.length);
  assert.ok(body.replace(/[\s`]/g, ""), `${label} is empty`); return body;
};
const canonicalSkill = resolve(directory, "../../skills/meta-prompt/SKILL.md");
const scenarioPath = resolve(directory, "codex-smoke-scenario.mjs");
const lockPath = resolve(directory, "evidence-lock.json");
const expectedFields = {
  "Goal and actor": /offline bookmark manager|implementation plan/i,
  "Deliverable and inputs": /Node\.js.*TypeScript.*plan|no files.*source code/i,
  "In scope": /add.*list.*remove.*ID|local JSON/i,
  "Exclusions": /(?=.*GUI)(?=.*cloud)(?=.*external services)/i,
  "Constraints": /Codex.*900 English words|900 English words.*Codex/i,
  "Acceptance Criteria and evidence": /invalid URL.*missing.*ID.*malformed JSON|duplicate.*canonical/i,
  "Failure conditions and edge cases": /(?=.*duplicate)(?=.*malformed JSON)/i,
  "Remaining assumptions": /Stable IDs|none|no material/i,
};
const fail = (message) => { throw new assert.AssertionError({ message }); };
const rawAssistant = (raw, thread, name) => {
  const events = raw.toString().split("\n").filter(Boolean).map(JSON.parse);
  assert.ok(events.length >= 5, `raw event grammar ${name}`);
  assert.deepEqual(events.slice(0, 3).map((event) => event.type), ["thread.started", "item.completed", "turn.started"], `raw event grammar ${name}`);
  assert.equal(events.at(-1).type, "turn.completed", `raw terminal event ${name}`);
  assert.equal(events.at(-1).status, undefined, `raw terminal status ${name}`);
  assert.equal(events.filter((event) => event.type === "thread.started").length, 1, `exactly one thread.started ${name}`);
  assert.equal(events[0].thread_id, thread, `raw thread ${name}`);
  assert.equal(events[1].item?.type, "error", `expected documented host warning ${name}`);
  assert.match(events[1].item?.message ?? "", /Under-development features enabled: chronicle/, `unexpected non-agent event ${name}`);
  for (const event of events.slice(3, -1)) assert.equal(event.type, "item.completed", `unknown raw event ${name}`);
  const agentEvents = events.slice(3, -1).filter((event) => event.item?.type === "agent_message");
  assert.ok(agentEvents.every((event) => typeof event.item.text === "string"), `agent message text ${name}`);
  const messages = agentEvents.map((event) => event.item.text).filter((text) => text.trim());
  assert.equal(messages.length, 1, `exactly one nonempty assistant message ${name}`); return messages[0];
};
const labeled = (text, label) => {
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?\\*{0,2}${label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\*{0,2}\\s*:\\s*(.+)`, "i"));
  assert.ok(match?.[1]?.trim(), `nonempty Alignment field: ${label}`); return match[1].trim();
};
const validateSemanticContract = (t) => {
  assert.match(t[0].assistant, /Context Dump/i); assert.match(t[0].assistant, /덤프 끝|dump complete/i); assert.match(t[0].assistant, /receipt|수신(?:\s*확인|만)/i);
  assert.match(t[1].assistant, /^(?:받았습니다|수신했습니다|Received)/i, "pre-signal receipt grammar");
  assert.match(t[1].assistant, /(?:계속 보내시거나|continue|덤프 끝|dump complete)/i, "pre-signal receipt grammar");
  assert.doesNotMatch(t[1].assistant, /requirements|architecture|inspect|select|plan|bookmark|decision/i, "pre-signal receipt grammar");
  assert.match(t[2].user, /덤프 끝|dump complete/i);
  const decisions = t.map((turn) => ({ turn, id: turn.assistant.match(/(?:^|\n)Decision ID:\s*([a-z][a-z0-9_-]*)/i)?.[1] })).filter((item) => item.id);
  assert.deepEqual(decisions.map((item) => item.id).sort(), Object.keys(decisionBank).sort(), "exact decision register coverage");
  for (const { turn, id } of decisions) {
    assert.match(turn.assistant, /Recommendation:\s*\S/i, `clarification recommendation ${id}`);
    assert.match(turn.assistant, /User Decision Request:\s*\S/i, `clarification request ${id}`);
  }
  const gateIndex = t.findIndex((turn) => /Goal and actor:/.test(turn.assistant) && /Remaining assumptions:/.test(turn.assistant)); assert.ok(gateIndex > 2, "Alignment Gate"); const gate = t[gateIndex].assistant;
  for (const [label, expected] of Object.entries(expectedFields)) assert.match(labeled(gate, label), expected, `approved Alignment state: ${label}`);
  assert.doesNotMatch(gate, /\b(?:TBD|unresolved|needs decision|still needs)\b|\?/i, "gate has unresolved decision");
  assert.match(gate, /(?:reply\s+)?`?approve`?.*(?:authorize|승인)|approve.*(?:authorize|승인)/i, "approval semantics"); assert.doesNotMatch(gate, /approve\s+means\s+reject/i, "approval semantics");
  assert.match(t[gateIndex + 1].user, /^approve$/i, "exact approval command");
  for (const turn of t.slice(0, gateIndex + 1)) assert.doesNotMatch(turn.assistant, /^(?:#{1,6}\s+|\*\*)English Final Prompt/m, "premature final");
  const delivery = t[gateIndex + 1].assistant, english = section(delivery, labels[0]), korean = section(delivery, labels[1]), run = section(delivery, labels[2]);
  assert.ok(delivery.indexOf(labels[0]) < delivery.indexOf(labels[1]) && delivery.indexOf(labels[1]) < delivery.indexOf(labels[2]));
  for (const phrase of [/offline bookmark manager/i, /remove <id>/i, /canonical URL.*already exists|duplicate.*fail/i, /one local JSON file/i, /CLI only|no GUI/i, /offline.*cloud|Do not include cloud/i, /malformed JSON/i, /(?=[\s\S]*XDG data home)(?=[\s\S]*Application Support)(?=[\s\S]*LocalAppData)/i]) assert.match(english, phrase, "approved state lost in English Final Prompt");
  assert.ok((korean.match(/[가-힣]/g) ?? []).length >= 30, "Review Translation must be substantive Korean"); assert.match(korean, /ID.*(?:삭제|제거)|ID 기반/i, "Korean approved state");
  assert.match(run, /Fresh Run/i); assert.match(run, /only the English Final Prompt|English Final Prompt(?:\*\*)?만/i); assert.match(run, /900 English words/i); assert.match(run, /Quality Gate.*(?:passed|통과)/i); assert.match(run, /canonical-URL duplicate|duplicate URL/i); return { delivery };
};
export function validateEvidence({ transcript, manifest, rawFiles, derivedBytes }) {
  assert.equal(manifest.entries.length, manifest.nextIndex); assert.equal(manifest.nextIndex, transcript.turns.length);
  assert.equal(manifest.supportedModel, supportedModel, "false model provenance");
  assert.match(manifest.captureUtc, /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/, "UTC capture timestamp");
  assert.match(manifest.hostVersion, /^codex-cli 0\.144\.6$/, "CLI version provenance");
  assert.match(manifest.threadId, /^[0-9a-f-]{36}$/i); assert.match(manifest.skillSha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.skill, canonicalSkill, "canonical skill path provenance"); assert.match(manifest.fresh, /^\/tmp\/issue2-register-capture\./, "fresh project provenance");
  assert.equal(manifest.skillSha256, sha(readFileSync(canonicalSkill)), "loaded canonical skill provenance");
  assert.equal(manifest.derivedSha256, sha(derivedBytes), "derived byte hash mismatch");
  assert.deepEqual(Object.keys(transcript), ["turns"]);
  for (const [i, entry] of manifest.entries.entries()) {
    const user = entry.user;
    assert.equal(typeof user, "string", `manifest user ${i}`);
    const expected = i === 0 ? ["exec", "--json", "--model", supportedModel, "-C", manifest.fresh, user] : ["exec", "resume", "--json", "--model", supportedModel, manifest.threadId, user];
    assert.equal(entry.index, i); assert.equal(entry.status, 0); assert.deepEqual(entry.args, expected, `manifest command shape ${i}`);
    assert.equal(entry.sha256, sha(rawFiles[i]), `raw bytes ${entry.raw}`);
    const assistant = rawAssistant(rawFiles[i], manifest.threadId, entry.raw);
    assert.deepEqual(transcript.turns[i], { index: i, user: i ? user : null, assistant }, `derived binding ${i}`);
  }
  const t = transcript.turns; validateSemanticContract(t);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.deepEqual({ threadId: manifest.threadId, skillSha256: sha(readFileSync(canonicalSkill)), scenarioSha256: sha(readFileSync(scenarioPath)), rawSha256: rawFiles.map((raw) => sha(raw)), derivedSha256: sha(derivedBytes) }, lock, "evidence lock provenance");
  return { status: "PASS", observedTurnCount: t.length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const e=resolve(directory,"evidence"), m=JSON.parse(await readFile(resolve(e,"manifest.json"))), b=await readFile(resolve(e,"derived-transcript.json")); const x=JSON.parse(b); const r=await Promise.all(m.entries.map((v)=>readFile(resolve(e,"raw",v.raw)))); console.log(`observed Codex smoke transcript: ${validateEvidence({transcript:x,manifest:m,rawFiles:r,derivedBytes:b}).status} (${x.turns.length} turns)`); }
