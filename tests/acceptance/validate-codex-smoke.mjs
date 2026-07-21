import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { captureTurns, supportedModel } from "./codex-smoke-scenario.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const labels = ["English Final Prompt", "Review Translation", "Run Instructions"];
const section = (text, label) => {
  const heads = [...text.matchAll(/^(?:#{1,6}\s+|\*\*)(English Final Prompt|Review Translation|Run Instructions)(?:\*\*)?\s*$/gim)];
  const index = heads.findIndex((h) => h[1] === label); assert.notEqual(index, -1, `missing exact ${label}`);
  const body = text.slice(heads[index].index + heads[index][0].length, heads[index + 1]?.index ?? text.length);
  assert.ok(body.replace(/[\s`]/g, ""), `${label} is empty`); return body;
};
const rawAssistant = (raw, thread, name) => {
  const events = raw.toString().split("\n").filter(Boolean).map(JSON.parse);
  assert.equal(events[0].type, "thread.started", `raw event sequence ${name}`); assert.equal(events[1].type, "item.completed"); assert.equal(events[2].type, "turn.started"); assert.equal(events.at(-1).type, "turn.completed");
  assert.equal(events[0].thread_id, thread, `raw thread ${name}`);
  assert.equal(events[1].item?.type, "error", `expected documented host warning ${name}`);
  assert.match(events[1].item?.message ?? "", /Under-development features enabled: chronicle/, `unexpected non-agent event ${name}`);
  const messages = events.slice(3, -1).filter((e) => e.item?.type === "agent_message").map((e) => e.item.text).filter((text) => text.trim());
  assert.equal(messages.length, 1, `exactly one nonempty assistant message ${name}`); return messages[0];
};
export function validateEvidence({ transcript, manifest, rawFiles, derivedBytes }) {
  assert.equal(manifest.entries.length, captureTurns.length); assert.equal(manifest.nextIndex, captureTurns.length);
  assert.equal(manifest.supportedModel, supportedModel, "false model provenance");
  assert.match(manifest.captureUtc, /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/, "UTC capture timestamp");
  assert.match(manifest.hostVersion, /^codex-cli 0\.144\.6$/, "CLI version provenance");
  assert.match(manifest.threadId, /^[0-9a-f-]{36}$/i); assert.match(manifest.skillSha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.derivedSha256, sha(derivedBytes), "derived byte hash mismatch");
  assert.deepEqual(Object.keys(transcript), ["turns"]); assert.equal(transcript.turns.length, captureTurns.length);
  for (const [i, entry] of manifest.entries.entries()) {
    const expected = i === 0 ? ["exec", "--json", "--model", supportedModel, "-C", manifest.fresh, captureTurns[0]] : ["exec", "resume", "--json", "--model", supportedModel, manifest.threadId, captureTurns[i]];
    assert.equal(entry.index, i); assert.equal(entry.status, 0); assert.deepEqual(entry.args, expected, `manifest command shape ${i}`);
    assert.equal(entry.sha256, sha(rawFiles[i]), `raw bytes ${entry.raw}`);
    const assistant = rawAssistant(rawFiles[i], manifest.threadId, entry.raw);
    assert.deepEqual(transcript.turns[i], { index: i, user: i ? captureTurns[i] : null, assistant }, `derived binding ${i}`);
  }
  const t = transcript.turns;
  assert.match(t[0].assistant, /Context Dump/i); assert.match(t[0].assistant, /덤프 끝|dump complete/i); assert.match(t[0].assistant, /receipt|수신(?:\s*확인|만)/i);
  assert.match(t[1].assistant, /dump complete|덤프 끝/i); assert.doesNotMatch(t[1].assistant, /analys|분석|design|설계|solve|해결|implement|구현|prompt|프롬프트/i, "pre-signal receipt action");
  assert.match(t[2].user, /덤프 끝|dump complete/i); assert.match(t[2].assistant, /Target Tool/i); assert.match(t[3].assistant, /Prompt Budget/i);
  for (const turn of t.slice(4, 10)) { assert.match(turn.assistant, /recommend|권장/i, "clarification recommendation"); assert.equal((turn.assistant.match(/\?/g) ?? []).length, 1, "one clarification decision"); }
  assert.match(t[10].user, /ID-based removal/i); assert.match(t[10].assistant, /ID.*(?:confirm|확정|기록)/i, "removal answer must progress state");
  assert.match(t[11].user, /all material decisions are resolved/i); const gate = t[11].assistant;
  for (const field of ["Goal", "Deliverable", "scope", "exclusions", "Target Tool", "Prompt Budget", "Acceptance Criteria", "Failure", "Remaining assumption"]) assert.match(gate, new RegExp(field, "i"));
  assert.doesNotMatch(gate, /\bTBD\b|\?/, "gate has unresolved decision"); assert.match(gate, /ID-based|ID.*삭제/i); assert.match(t[12].user, /^approve$/i);
  for (const turn of t.slice(0, 12)) assert.doesNotMatch(turn.assistant, /^(?:#{1,6}\s+|\*\*)English Final Prompt/m, "premature final");
  const delivery = t[12].assistant, english = section(delivery, labels[0]), korean = section(delivery, labels[1]), run = section(delivery, labels[2]);
  assert.ok(delivery.indexOf(labels[0]) < delivery.indexOf(labels[1]) && delivery.indexOf(labels[1]) < delivery.indexOf(labels[2]));
  for (const term of ["Node.js", "TypeScript", "add", "list", "remove", "ID", "JSON", "URL", "cloud", "GUI", "malformed"]) assert.match(english, new RegExp(term, "i"), `approved state lost: ${term}`);
  assert.match(korean, /[가-힣]{5,}/, "Review Translation must be substantive Korean"); assert.match(korean, /Node\.js|TypeScript/i);
  assert.match(run, /Fresh Run/i); assert.match(run, /only the English Final Prompt|English Final Prompt(?:\*\*)?만/i); for (const term of ["invalid URL|잘못된 URL", "missing|없는 ID", "malformed JSON|손상된 JSON"]) assert.match(run, new RegExp(term, "i"), "unmapped success check");
  assert.match(delivery, /Quality Gate(?:\s*결과)?\s*(?::|은|는)?\s*(?:\*\*)?(?:Passed|통과)/i); assert.doesNotMatch(english, /\bBuild\b.{0,20}(?:cloud|GUI)|\binclude (?:a )?(?:cloud|GUI)/i, "false Quality Gate");
  return { status: "PASS", observedTurnCount: t.length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const e=resolve(directory,"evidence"), m=JSON.parse(await readFile(resolve(e,"manifest.json"))), b=await readFile(resolve(e,"derived-transcript.json")); const x=JSON.parse(b); const r=await Promise.all(m.entries.map((v)=>readFile(resolve(e,"raw",v.raw)))); console.log(`observed Codex smoke transcript: ${validateEvidence({transcript:x,manifest:m,rawFiles:r,derivedBytes:b}).status} (${x.turns.length} turns)`); }
