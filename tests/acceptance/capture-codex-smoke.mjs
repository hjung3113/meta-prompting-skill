#!/usr/bin/env node
// On-demand only. Each invocation performs at most one live Codex turn.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { alignmentTurn, approvalTurn, bootstrapTurns, decisionBank, resolveDecisionId, supportedModel } from "./codex-smoke-scenario.mjs";
import { parseAlignmentGate } from "./alignment-gate.mjs";

const root = resolve(import.meta.dirname, "../..");
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const atomic = (path, value) => { const temp = `${path}.tmp`; writeFileSync(temp, JSON.stringify(value, null, 2)); renameSync(temp, path); };
const isGate = (text) => { try { parseAlignmentGate(text); return /approve/i.test(text); } catch { return false; } };
const isAlignmentRequest = (text) => /(?:present|show|prepare|provide) (?:the )?(?:complete )?Alignment Gate|Alignment Gate.*(?:now|next)/i.test(text);
const isDelivery = (text) => ["English Final Prompt", "Review Translation", "Run Instructions"].every((label) => text.includes(label));
const clarificationBlock = (text) => { const match = text.match(/(?:^|\n)Decision ID:\s*([a-z][a-z0-9_-]*)\s*\nRecommendation:\s*(\S[^\n]*)\s*\nUser Decision Request:\s*(\S[^\n]*)/i); if (!match) throw new Error("missing structured clarification block"); if ((text.match(/(?:^|\n)Decision ID:/g) ?? []).length !== 1) throw new Error("duplicate structured clarification block"); return { id: match[1], recommendation: match[2], request: match[3] }; };
const command = process.argv[2]; const capture = resolve(process.argv[3] ?? "");
if (!command || !capture) throw new Error("usage: init <capture-dir> | step <capture-dir> | finalize <capture-dir>");
const statePath = join(capture, "checkpoint.json");
if (command === "init") {
  if (process.argv[4] === "--replace") rmSync(capture, { recursive: true, force: true });
  if (existsSync(statePath)) throw new Error("checkpoint exists; fail closed");
  mkdirSync(capture, { recursive: true }); mkdirSync(join(capture, "raw"), { recursive: true }); const fresh = join(capture, "fresh-project");
  mkdirSync(join(fresh, ".agents", "skills"), { recursive: true });
  spawnSync("git", ["init", "-q"], { cwd: fresh, stdio: "ignore" });
  symlinkSync(resolve(root, "skills/meta-prompt"), join(fresh, ".agents", "skills", "meta-prompt"));
  const skillLogicalPath = "skills/meta-prompt/SKILL.md";
  const skillPath = resolve(root, skillLogicalPath);
  atomic(statePath, { fresh, nextIndex: 0, threadId: null, entries: [], pending: null, resolved: [], phase: "bootstrap", skillLogicalPath, skillCapturePath: realpathSync(skillPath), skillSha256: hash(skillPath), supportedModel, captureUtc: new Date().toISOString() });
}
const state = JSON.parse(readFileSync(statePath, "utf8"));
if (command === "step") {
  const index = state.nextIndex; if (state.phase === "complete") { console.log("complete"); process.exit(0); }
  const user = index < bootstrapTurns.length ? bootstrapTurns[index] : state.pending ? decisionBank[state.pending].answer : state.phase === "alignment" ? alignmentTurn : state.phase === "approval" ? approvalTurn : (() => { throw new Error("no uniquely matched unresolved decision"); })();
  const args = index === 0 ? ["exec", "--json", "--model", state.supportedModel, "-C", state.fresh, user] : ["exec", "resume", "--json", "--model", state.supportedModel, state.threadId, user];
  const result = spawnSync("codex", args, { cwd: state.fresh, input: "", encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
  const raw = join(capture, "raw", `turn-${String(index).padStart(2, "0")}.jsonl`); writeFileSync(raw, result.stdout); writeFileSync(`${raw}.stderr`, result.stderr);
  if (result.status !== 0) throw new Error(`turn ${index} failed: ${result.status}`);
  if (index === 0) { const line = result.stdout.split("\n").find((x) => x.includes("thread.started")); state.threadId = JSON.parse(line).thread_id; }
  const events = result.stdout.split("\n").filter(Boolean).map(JSON.parse); const assistant = events.filter((event) => event.item?.type === "agent_message" && event.item.text?.trim()).at(-1)?.item.text;
  if (!assistant) throw new Error(`missing assistant output ${index}`);
  const answered = state.pending; if (answered) state.resolved.push(answered); state.pending = null;
  if (index >= 2 && state.phase === "bootstrap") state.phase = "clarifying";
  if (state.phase === "clarifying") {
    if (isGate(assistant)) { if (state.resolved.length !== Object.keys(decisionBank).length) throw new Error(`premature Alignment Gate ${index}`); state.phase = "approval"; }
    else {
      const block = clarificationBlock(assistant);
      const id = resolveDecisionId(block.id, decisionBank, state.resolved);
      state.pending = id;
    }
  } else if (state.phase === "alignment") { if (!isGate(assistant)) throw new Error(`field-complete Alignment Gate required ${index}`); state.phase = "approval"; }
  else if (state.phase === "approval") { if (!isDelivery(assistant)) throw new Error(`separated delivery required ${index}`); state.phase = "complete"; }
  state.entries.push({ index, user, args, status: result.status, raw: raw.split("/").at(-1), sha256: hash(raw) }); state.nextIndex += 1; atomic(statePath, state); console.log(`checkpointed ${index}`);
} else if (command === "finalize") {
  if (state.phase !== "complete") throw new Error("incomplete capture");
  for (const entry of state.entries) {
    const raw = join(capture, "raw", entry.raw);
    if (!existsSync(raw)) throw new Error(`missing raw capture: ${entry.raw}`);
    entry.sha256 = hash(raw);
  }
  atomic(join(capture, "manifest.json"), { ...state, hostVersion: spawnSync("codex", ["--version"], { encoding: "utf8" }).stdout.trim(), redactions: "none; synthetic context" }); console.log(join(capture, "manifest.json"));
}
