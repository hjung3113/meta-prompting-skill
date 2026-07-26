import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCrossToolContract } from "./validate-cross-tool-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const smokeRecords = [
  ["codex-cli", "tests/acceptance/codex-smoke.json"],
  ["claude-code", "tests/acceptance/claude-smoke.json"],
  ["opencode", "tests/acceptance/opencode-smoke.json"],
];
const completionCriteria = [
  "One canonical skill and no tool-specific workflow copies",
  "One `skills.sh` command installs for all three tools",
  "First invocation explains dumping and completion",
  "No analysis or generation before completion",
  "Target Tool confirmation and relevant read-only grounding",
  "One-at-a-time questions with recommendations",
  "Observable Acceptance Criteria before alignment approval",
  "No Final Prompt before user approval",
  "Separate English Final Prompt, Korean Review Translation, and Run Instructions",
  "Explicit Fresh Run and English-only copy guidance",
  "Quality checks for budget, contract, sensitive data, and compatibility",
  "Every Acceptance Scenario passes across all three tools",
  "Static validation, documentation, and link checks pass in CI",
  "README alone makes installation, use, limitations, and contribution reproducible",
  "Real installation and invocation evidence exists for all three tools",
];

export async function validateReleaseCandidate() {
  const [license, readme, checklist] = await Promise.all([
    readFile(resolve(root, "LICENSE"), "utf8"),
    readFile(resolve(root, "README.md"), "utf8"),
    readFile(resolve(root, "docs/release-checklist.md"), "utf8"),
  ]);

  assert.match(license, /^MIT License/m);
  assert.match(license, /Permission is hereby granted/m);
  for (const heading of ["## Install", "## First use", "## Copy the output", "## Limitations", "## Update", "## Contribute"]) {
    assert.match(readme, new RegExp(`^${heading}$`, "m"));
  }
  assert.match(readme, /\.\/skills\.sh \/path\/to\/project/);
  assert.match(readme, /덤프 끝/);
  assert.match(readme, /dump complete/);
  assert.match(readme, /English Final Prompt.*copy this section only/i);
  const normalizedChecklist = checklist.replace(/\s+/g, " ");
  assert.match(normalizedChecklist, /Public conversion is deliberately outside this issue/);
  for (const criterion of completionCriteria) {
    assert.match(normalizedChecklist, new RegExp(`- \\[x\\] ${criterion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }

  for (const [tool, recordPath] of smokeRecords) {
    const record = JSON.parse(await readFile(resolve(root, recordPath), "utf8"));
    assert.equal(record.tool, tool);
    for (const field of ["version", "verifiedAt", "installation", "invocation", "scenario", "result"]) {
      assert.match(record[field], /.+/, `${recordPath} has ${field}`);
    }
    assert.match(record.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(record.result, /^PASS:/);
  }

  await validateCrossToolContract();
  return { status: "PASS", completionCriteria: completionCriteria.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validateReleaseCandidate();
  console.log(`release candidate: ${result.status} (${result.completionCriteria} v1 completion criteria)`);
}
