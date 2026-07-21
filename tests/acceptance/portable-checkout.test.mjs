import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const copy = mkdtempSync(resolve(tmpdir(), "issue2-portable-checkout-"));
try {
  cpSync(resolve(root, "skills"), resolve(copy, "skills"), { recursive: true });
  cpSync(resolve(root, "tests"), resolve(copy, "tests"), { recursive: true });
  for (const args of [["tests/acceptance/validate-static-contract.mjs"], ["tests/acceptance/validate-codex-smoke.mjs"], ["--test", "tests/meta-prompt-contract.test.mjs"]]) {
    const result = spawnSync(process.execPath, args, { cwd: copy, encoding: "utf8" });
    assert.equal(result.status, 0, `${args.join(" ")} in relocated checkout:\n${result.stdout}\n${result.stderr}`);
  }
  console.log("portable checkout regression: PASS");
} finally {
  rmSync(copy, { recursive: true, force: true });
}
