import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStaticSkillContract } from "./acceptance/validate-static-contract.mjs";
import { validateEvidence } from "./acceptance/validate-codex-smoke.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidence = resolve(repoRoot, "tests/acceptance/evidence");
const skill = await readFile(resolve(repoRoot, "skills/meta-prompt/SKILL.md"), "utf8");
const scenario = JSON.parse(await readFile(resolve(repoRoot, "tests/acceptance/happy-path.json"), "utf8"));
const transcript = JSON.parse(await readFile(resolve(evidence, "derived-transcript.json"), "utf8"));
const manifest = JSON.parse(await readFile(resolve(evidence, "manifest.json"), "utf8"));
const rawFiles = await Promise.all(manifest.entries.map((entry) => readFile(resolve(evidence, "raw", entry.raw))));
const clone = (value) => structuredClone(value);

assert.equal(validateStaticSkillContract({ skill, scenario }).status, "PASS");
assert.equal(validateEvidence({ transcript, manifest, rawFiles }).status, "PASS");
assert.equal(manifest.skillSha256, createHash("sha256").update(skill).digest("hex"));

const expectRejected = (name, mutate, expression) => {
  const candidate = { transcript: clone(transcript), manifest: clone(manifest), rawFiles: [...rawFiles] };
  mutate(candidate);
  if (name !== "derived corruption") candidate.manifest.derivedSha256 = createHash("sha256").update(JSON.stringify(candidate.transcript, null, 2)).digest("hex");
  assert.throws(() => validateEvidence(candidate), expression, name);
};
expectRejected("role/order swap", ({ transcript: t }) => { [t.turns[2], t.turns[3]] = [t.turns[3], t.turns[2]]; }, /index|Target Tool/);
expectRejected("premature final", ({ transcript: t }) => { t.turns[11].assistant += "\n**English Final Prompt**\ntext"; }, /premature/);
expectRejected("incomplete gate", ({ transcript: t }) => { t.turns[11].assistant = "Alignment Gate: Goal only. Reply approve."; }, /Deliverable/);
expectRejected("approval drift", ({ transcript: t }) => { t.turns[12].user = "approved with changes"; }, /approval/);
expectRejected("wrong artifact", ({ transcript: t }) => { t.turns[12].assistant = "Quality Gate: Passed\n**English Final Prompt**\ncloud GUI\n**Review Translation**\n번역\n**Run Instructions**\nFresh Run; paste only the English Final Prompt."; }, /misses|invalid URL|missing ID/);
expectRejected("empty artifact", ({ transcript: t }) => { t.turns[12].assistant = t.turns[12].assistant.replace(/(## Review Translation\s*\n)[\s\S]*?(?=\n## Run Instructions)/i, "$1"); }, /empty|missing/);
expectRejected("label drift", ({ transcript: t }) => { t.turns[12].assistant = t.turns[12].assistant.replace("Review Translation", "Korean Translation"); }, /Review Translation/);
expectRejected("success-check mismatch", ({ transcript: t }) => { const at = t.turns[12].assistant.indexOf("## Run Instructions"); t.turns[12].assistant = `${t.turns[12].assistant.slice(0, at)}${t.turns[12].assistant.slice(at).replace(/invalid URL|잘못된 URL/i, "unhappy path")}`; }, /invalid URL|잘못된 URL/);
expectRejected("raw corruption", ({ rawFiles: raw }) => { raw[0] = Buffer.from("corrupt"); }, /raw hash mismatch/);
expectRejected("derived corruption", ({ transcript: t }) => { t.turns[0].assistant += " altered"; }, /derived transcript hash mismatch/);
expectRejected("manifest corruption", ({ manifest: m }) => { m.entries[0].sha256 = "0".repeat(64); }, /raw hash mismatch/);
for (const field of ["supportedModel", "captureUtc", "hostVersion", "threadId"]) {
  expectRejected(`missing provenance ${field}`, ({ manifest: m }) => { delete m[field]; }, /provenance/);
  expectRejected(`false provenance ${field}`, ({ manifest: m }) => { m[field] = field === "captureUtc" ? "yesterday" : "false"; }, /model|timestamp|CLI|thread/);
}

console.log("meta-prompt canonical contract: PASS");
