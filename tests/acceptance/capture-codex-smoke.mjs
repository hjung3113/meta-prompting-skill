#!/usr/bin/env node
// On-demand only: creates live Codex evidence. Routine tests never import it.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const skill = resolve(root, "skills/meta-prompt/SKILL.md");
const fresh = mkdtempSync(join(tmpdir(), "meta-prompt-smoke-"));
execFileSync("git", ["init", "-q"], { cwd: fresh });
mkdirSync(join(fresh, ".agents", "skills"), { recursive: true });
symlinkSync(resolve(root, "skills/meta-prompt"), join(fresh, ".agents", "skills", "meta-prompt"));
const turns = [
  "$meta-prompt",
  "I need a fictional offline bookmark manager plan.",
  "It must support add, list, remove; no cloud sync or GUI. 덤프 끝",
  "Confirm Codex as the Target Tool.",
  "Confirm 900 English words maximum.",
  "Use Node.js with TypeScript.",
  "Use a standalone Markdown plan returned in the response only.",
  "Use add, list, remove with generated ID, required URL, optional title and tags.",
  "Adopt the exact add/list/remove acceptance criterion and automated tests for URL validation and malformed JSON.",
  "Adopt invalid URL, missing ID, and malformed JSON as named failures; exclusions are no implementation, cloud, GUI, external services; remaining assumptions are none. Present Alignment Gate.",
  "approve",
];
const run = (args, name) => {
  const result = spawnSync("codex", args, { cwd: fresh, input: "", encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
  const output = `${result.stdout}${result.stderr}`;
  writeFileSync(join(fresh, `${name}.jsonl`), output);
  if (result.status !== 0) throw new Error(`${name} failed: ${result.status} ${result.error?.message ?? result.stderr}`);
  return output;
};
const first = run(["exec", "--json", "-C", fresh, turns[0]], "turn-00");
const thread = JSON.parse(first.split("\n").find((line) => line.includes("thread.started"))).thread_id;
const commands = [["codex", "exec", "--json", "-C", fresh, turns[0]]];
for (const [index, turn] of turns.slice(1).entries()) {
  run(["exec", "resume", "--json", thread, turn], `turn-${String(index + 1).padStart(2, "0")}`);
  commands.push(["codex", "exec", "resume", "--json", thread, turn]);
}
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
writeFileSync(join(fresh, "manifest.json"), JSON.stringify({
  recordedAt: new Date().toISOString(), hostVersion: execFileSync("codex", ["--version"], { encoding: "utf8" }).trim(),
  model: "configured Codex model", freshProject: fresh, inheritedConfig: "default user config and rules; inventory required in manifest consumer",
  skill, resolvedSkill: realpathSync(skill), skillSha256: hash(skill), link: realpathSync(join(fresh, ".agents/skills/meta-prompt/SKILL.md")),
  threadId: thread, commands, exitStatuses: commands.map(() => 0), rawFiles: commands.map((_, i) => `turn-${String(i).padStart(2, "0")}.jsonl`), redactions: "none; synthetic context only",
}, null, 2));
console.log(fresh);
