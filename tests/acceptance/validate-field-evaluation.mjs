import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function assertNoFieldEvaluationOrEgressInProductSurface(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await assertNoFieldEvaluationOrEgressInProductSurface(entryPath);
      continue;
    }
    if (!entry.isFile()) continue;
    const content = await readFile(entryPath, "utf8");
    assert.doesNotMatch(
      content,
      /Field Evaluation|GitHub feedback issue|automatic(?:ally)? (?:create|report).*issue|telemetry|model (?:call|invocation)/i,
      `${entryPath} keeps reporting and model calls outside the product surface`,
    );
  }
}

export async function validateFieldEvaluation() {
  const [guide, template, readme, skill, workflow] = await Promise.all([
    readFile(resolve(root, "docs/field-evaluation.md"), "utf8"),
    readFile(resolve(root, ".github/ISSUE_TEMPLATE/field-evaluation.yml"), "utf8"),
    readFile(resolve(root, "README.md"), "utf8"),
    readFile(resolve(root, "skills/meta-prompt/SKILL.md"), "utf8"),
    readFile(resolve(root, ".github/workflows/cross-tool-contract.yml"), "utf8"),
  ]);

  assert.match(readme, /\[Field Evaluation\]\(docs\/field-evaluation\.md\)/);
  assert.match(guide, /^# Field Evaluation$/m);
  assert.match(guide, /development-only/i);
  assert.match(guide, /after.*Fresh Run/i);
  assert.match(guide, /user[\s\S]*approv/i);
  assert.match(guide, /raw Context Dump/i);
  assert.match(guide, /credentials/i);
  assert.match(guide, /private source/i);
  assert.match(guide, /Prompt quality/i);
  assert.match(guide, /Execution outcome/i);
  assert.match(guide, /Acceptance Criterion outcomes/i);
  for (const category of [
    "Prompt",
    "Target Tool/model",
    "Environment or permissions",
    "Input/context",
    "Unknown/mixed",
  ]) {
    assert.match(guide, new RegExp(`^\\s*-\\s+${category.replace("/", "\\/")}:`, "m"));
  }
  assert.match(guide, /not.*release gate/i);
  assert.match(guide, /not.*causality/i);

  assert.match(template, /^name: Field Evaluation Report$/m);
  assert.match(template, /^labels: \["feedback", "needs-triage"\]$/m);
  for (const field of ["Prompt quality", "Execution outcome", "Acceptance Criterion outcomes"]) {
    assert.match(template, new RegExp(`label: ${field}`));
  }
  for (const consent of ["sanitisation-consent", "publication-consent"]) {
    assert.match(template, new RegExp(`id: ${consent}[\\s\\S]*?required: true`));
  }
  assert.match(template, /raw Context Dump/i);
  assert.match(template, /credentials/i);

  assert.doesNotMatch(skill, /Field Evaluation|GitHub feedback issue|automatic issue/i);
  assert.deepEqual(
    [...workflow.matchAll(/^\s*- uses: (.+)$/gm)].map((match) => match[1]),
    ["actions/checkout@v4", "actions/setup-node@v4"],
  );
  assert.match(workflow, /name: Release candidate\s+run: node tests\/acceptance\/validate-release-candidate\.mjs/);
  assert.match(workflow, /name: Field Evaluation\s+run: node tests\/acceptance\/validate-field-evaluation\.mjs/);
  assert.match(workflow, /^\s*node-version: 22$/m);
  await Promise.all([
    assertNoFieldEvaluationOrEgressInProductSurface(resolve(root, "skills")),
    assertNoFieldEvaluationOrEgressInProductSurface(resolve(root, "adapters")),
  ]);

  const unsafeProductSurface = await mkdtemp(resolve(tmpdir(), "meta-prompt-field-evaluation-"));
  try {
    await writeFile(resolve(unsafeProductSurface, "unsafe-skill.md"), "telemetry");
    await assert.rejects(assertNoFieldEvaluationOrEgressInProductSurface(unsafeProductSurface));
  } finally {
    await rm(unsafeProductSurface, { recursive: true, force: true });
  }
  return { status: "PASS" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validateFieldEvaluation();
  console.log(`field evaluation contract: ${result.status}`);
}
