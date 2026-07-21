#!/usr/bin/env node
// On-demand only. Each invocation performs at most one live Codex turn.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const turns = ["$meta-prompt", "I need a fictional offline bookmark manager plan.", "It needs add, list, remove; no cloud sync or GUI. 덤프 끝", "Confirm Codex as the Target Tool.", "Confirm 900 English words maximum.", "Use Node.js with TypeScript.", "Use a Markdown plan returned only in the response.", "Use generated IDs, required URLs, optional title and tags.", "Adopt the exact add/list/remove criterion and URL-validation plus malformed-JSON tests.", "Adopt invalid URL, missing ID, malformed JSON failures; exclusions are implementation, cloud, GUI, external services; remaining assumptions none.", "Confirm local JSON storage in a suitable user data directory.", "Present the complete Alignment Gate now, including every mandatory field and remaining assumptions.", "approve"];
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const atomic = (path, value) => { const temp = `${path}.tmp`; writeFileSync(temp, JSON.stringify(value, null, 2)); renameSync(temp, path); };
const command = process.argv[2]; const capture = resolve(process.argv[3] ?? "");
const supportedModel = "gpt-5.6-terra";
if (!command || !capture) throw new Error("usage: init <capture-dir> | step <capture-dir> | finalize <capture-dir>");
const statePath = join(capture, "checkpoint.json");
if (command === "init") {
  if (process.argv[4] === "--replace") rmSync(capture, { recursive: true, force: true });
  if (existsSync(statePath)) throw new Error("checkpoint exists; fail closed");
  mkdirSync(capture, { recursive: true }); mkdirSync(join(capture, "raw"), { recursive: true }); const fresh = join(capture, "fresh-project");
  mkdirSync(join(fresh, ".agents", "skills"), { recursive: true });
  spawnSync("git", ["init", "-q"], { cwd: fresh, stdio: "ignore" });
  symlinkSync(resolve(root, "skills/meta-prompt"), join(fresh, ".agents", "skills", "meta-prompt"));
  atomic(statePath, { fresh, nextIndex: 0, threadId: null, entries: [], skill: realpathSync(resolve(root, "skills/meta-prompt/SKILL.md")), skillSha256: hash(resolve(root, "skills/meta-prompt/SKILL.md")), supportedModel, captureUtc: new Date().toISOString() });
}
const state = JSON.parse(readFileSync(statePath, "utf8"));
if (command === "step") {
  const index = state.nextIndex; if (index >= turns.length) { console.log("complete"); process.exit(0); }
  const args = index === 0 ? ["exec", "--json", "--model", state.supportedModel, "-C", state.fresh, turns[0]] : ["exec", "resume", "--json", "--model", state.supportedModel, state.threadId, turns[index]];
  const result = spawnSync("codex", args, { cwd: state.fresh, input: "", encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
  const raw = join(capture, "raw", `turn-${String(index).padStart(2, "0")}.jsonl`); writeFileSync(raw, result.stdout); writeFileSync(`${raw}.stderr`, result.stderr);
  if (result.status !== 0) throw new Error(`turn ${index} failed: ${result.status}`);
  if (index === 0) { const line = result.stdout.split("\n").find((x) => x.includes("thread.started")); state.threadId = JSON.parse(line).thread_id; }
  state.entries.push({ index, args, status: result.status, raw: raw.split("/").at(-1), sha256: hash(raw) }); state.nextIndex += 1; atomic(statePath, state); console.log(`checkpointed ${index}`);
} else if (command === "finalize") {
  if (state.nextIndex !== turns.length) throw new Error("incomplete capture");
  for (const entry of state.entries) {
    const raw = join(capture, "raw", entry.raw);
    if (!existsSync(raw)) throw new Error(`missing raw capture: ${entry.raw}`);
    entry.sha256 = hash(raw);
  }
  atomic(join(capture, "manifest.json"), { ...state, hostVersion: spawnSync("codex", ["--version"], { encoding: "utf8" }).stdout.trim(), redactions: "none; synthetic context" }); console.log(join(capture, "manifest.json"));
}
