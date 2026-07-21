#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const fresh = mkdtempSync(join(tmpdir(), "meta-prompt-probe-"));
spawnSync("git", ["init", "-q"], { cwd: fresh, stdio: "ignore" });
mkdirSync(join(fresh, ".agents", "skills"), { recursive: true });
symlinkSync(resolve(root, "skills/meta-prompt"), join(fresh, ".agents", "skills", "meta-prompt"));
const result = spawnSync("codex", ["exec", "--json", "-C", fresh, "$meta-prompt"], {
  cwd: fresh, input: "", encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000,
});
const evidence = { fresh, status: result.status, signal: result.signal, error: result.error?.message ?? null, stdout: result.stdout, stderr: result.stderr };
if (result.status !== 0 || !/"thread_id":"[0-9a-f-]+"/.test(result.stdout)) {
  console.error(JSON.stringify(evidence));
  process.exit(1);
}
console.log(JSON.stringify({ fresh, status: result.status, hasThread: true }));
