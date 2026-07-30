import assert from "node:assert/strict";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { validateClaudeAdapter } from "./validate-claude-adapter.mjs";
import { validateCodexAdapter } from "./validate-codex-adapter.mjs";
import { validateObservedTranscript } from "./validate-observed-transcript.mjs";
import { validateOpenCodeAdapter } from "./validate-opencode-adapter.mjs";
import { validateStaticSkillContract } from "./validate-static-contract.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalSkillDirectory = resolve(root, "skills/meta-prompt");
const canonicalSkillFile = resolve(canonicalSkillDirectory, "SKILL.md");
const matrixPath = resolve(root, "tests/acceptance/acceptance-scenarios.json");
const scenarioResultsPath = resolve(root, "tests/acceptance/tool-scenario-results.json");
const firstClassTools = [
  { tool: "codex-cli", adapter: "codex", installedPath: ".agents/skills/meta-prompt", smokeRecord: "tests/acceptance/codex-smoke.json" },
  { tool: "claude-code", adapter: "claude", installedPath: ".claude/skills/meta-prompt", smokeRecord: "tests/acceptance/claude-smoke.json" },
  { tool: "opencode", adapter: "opencode", installedPath: ".opencode/skills/meta-prompt", smokeRecord: "tests/acceptance/opencode-smoke.json" },
];
const expectedScenarioIds = [
  "first-use-context-dump",
  "receipt-before-completion",
  "one-recommended-decision",
  "approved-alignment-gate",
  "separated-fresh-run-delivery",
  "canonical-happy-path",
];
const workflowMarkers = [
  "context dump",
  "dump complete signal",
  "alignment gate",
  "english final prompt",
  "review translation",
  "run instructions",
  "execution scope contract",
];

function parseFrontmatter(skill) {
  const match = skill.match(/^---\n([\s\S]+?)\n---/);
  assert.ok(match, "canonical skill has YAML frontmatter");
  return Object.fromEntries(
    match[1].split("\n").map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator), line.slice(separator + 1).trim()];
    }),
  );
}

async function assertDocumentationLinks() {
  for (const documentPath of ["README.md", "docs/installation.md", "docs/release-checklist.md"]) {
    const absolutePath = resolve(root, documentPath);
    const document = await readFile(absolutePath, "utf8");
    const links = [...document.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((match) => match[1]);
    assert.ok(links.length > 0, `${documentPath} contains documentation links`);
    for (const link of links) {
      if (/^(https?:|#)/.test(link)) continue;
      await access(resolve(dirname(absolutePath), link.split("#")[0]));
    }
  }
}

async function assertNoAdapterWorkflowCopies(adapterRoot) {
  const entries = await readdir(adapterRoot, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(adapterRoot, entry.name);
    if (entry.isDirectory()) {
      await assertNoAdapterWorkflowCopies(entryPath);
      continue;
    }
    if (entry.isSymbolicLink()) {
      if (entry.name === "meta-prompt") {
        assert.equal(await realpath(entryPath), await realpath(canonicalSkillDirectory));
      }
      continue;
    }
    if (entry.isFile()) {
      const content = await readFile(entryPath, "utf8");
      const markerCount = workflowMarkers.filter((marker) => content.toLowerCase().includes(marker)).length;
      assert.ok(
        markerCount < 3,
        `adapter workflow copy found at ${relative(root, entryPath)}`,
      );
    }
  }
}

async function assertDuplicateDetection() {
  const fixture = await mkdtemp(resolve(tmpdir(), "meta-prompt-duplicate-"));
  try {
    await writeFile(
      resolve(fixture, "workflow-copy.txt"),
      "Run Instructions\nContext Dump\nAlignment Gate\n",
    );
    await assert.rejects(assertNoAdapterWorkflowCopies(fixture));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

async function assertUnifiedInstallation() {
  const project = await mkdtemp(resolve(tmpdir(), "meta-prompt-unified-install-"));
  const blockedProject = await mkdtemp(resolve(tmpdir(), "meta-prompt-unified-blocked-"));
  const parentBlockedProject = await mkdtemp(resolve(tmpdir(), "meta-prompt-unified-parent-blocked-"));
  try {
    await execFileAsync("bash", [resolve(root, "skills.sh"), project]);
    for (const { installedPath } of firstClassTools) {
      const installedSkill = resolve(project, installedPath);
      assert.equal((await lstat(installedSkill)).isSymbolicLink(), true);
      assert.equal(await realpath(installedSkill), await realpath(canonicalSkillDirectory));
    }
    await mkdir(resolve(blockedProject, ".claude/skills/meta-prompt"), { recursive: true });
    await assert.rejects(
      execFileAsync("bash", [resolve(root, "skills.sh"), blockedProject]),
      (error) => error.code === 73,
    );
    await assert.rejects(access(resolve(blockedProject, ".agents/skills/meta-prompt")));
    await assert.rejects(access(resolve(blockedProject, ".opencode/skills/meta-prompt")));
    await writeFile(resolve(parentBlockedProject, ".claude"), "not a directory");
    await assert.rejects(
      execFileAsync("bash", [resolve(root, "skills.sh"), parentBlockedProject]),
      (error) => error.code === 74,
    );
    for (const { installedPath } of firstClassTools) {
      await assert.rejects(access(resolve(parentBlockedProject, installedPath)));
    }
  } finally {
    await rm(project, { recursive: true, force: true });
    await rm(blockedProject, { recursive: true, force: true });
    await rm(parentBlockedProject, { recursive: true, force: true });
  }
}

async function assertPerToolInstallersRejectMissingProject() {
  const fixture = await mkdtemp(resolve(tmpdir(), "meta-prompt-missing-project-"));
  try {
    for (const { adapter, installedPath } of firstClassTools) {
      const missingProject = resolve(fixture, `${adapter}-typo`);
      await assert.rejects(
        execFileAsync("bash", [resolve(root, `adapters/${adapter}/install.sh`), missingProject]),
        (error) => error.code === 66,
      );
      await assert.rejects(access(resolve(missingProject, installedPath)));
      await assert.rejects(access(missingProject));
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

async function assertMatrixCoverage() {
  const [matrixSource, resultsSource, revisionResult] = await Promise.all([
    readFile(matrixPath, "utf8"),
    readFile(scenarioResultsPath, "utf8"),
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root }),
  ]);
  const matrix = JSON.parse(matrixSource);
  const scenarioResults = JSON.parse(resultsSource);
  assert.equal(matrix.version, 1);
  assert.equal(matrix.canonicalSkill, "skills/meta-prompt/SKILL.md");
  assert.deepEqual(matrix.firstClassTools, firstClassTools.map(({ tool }) => tool));
  assert.deepEqual(
    matrix.applications,
    firstClassTools.map(({ tool, adapter, installedPath, smokeRecord }) => ({
      tool,
      adapter: `adapters/${adapter}`,
      installedPath,
      smokeRecord,
    })),
  );
  assert.deepEqual(matrix.scenarios.map(({ id }) => id), expectedScenarioIds);
  for (const scenario of matrix.scenarios) {
    assert.match(scenario.criterion, /.+/);
    assert.match(scenario.observableOutcome, /.+/);
  }
  for (const { tool, smokeRecord } of firstClassTools) {
    const smoke = JSON.parse(await readFile(resolve(root, smokeRecord), "utf8"));
    assert.equal(smoke.tool, tool);
    assert.match(smoke.observation, /.+/);
  }
  const currentRevision = revisionResult.stdout.trim();
  await assertScenarioResults(scenarioResults, currentRevision);
  const staleRevision = "9d788736e4f7cff52bb8ffb736d0249f9563ac77";
  const staleResults = {
    ...scenarioResults,
    revision: staleRevision,
    results: scenarioResults.results.map((result) => ({ ...result, revision: staleRevision })),
  };
  await assert.rejects(
    assertScenarioResults(staleResults, currentRevision),
    /revision-bound evidence no longer matches the contract surface/,
    "a result set becomes stale when its tested contract changes",
  );
  await assert.rejects(
    assertScenarioResults({ ...scenarioResults, results: scenarioResults.results.slice(1) }, currentRevision),
    /exactly one result/,
    "a missing tool/scenario pair is rejected",
  );
}

async function assertScenarioResults(scenarioResults, currentRevision) {
  assert.equal(scenarioResults.version, 1);
  assert.match(scenarioResults.revision, /^[0-9a-f]{40}$/);
  await execFileAsync("git", ["merge-base", "--is-ancestor", scenarioResults.revision, currentRevision], { cwd: root });
  const contractChanged = await execFileAsync(
    "git",
    [
      "diff",
      "--quiet",
      scenarioResults.revision,
      currentRevision,
      "--",
      "skills/meta-prompt",
      "adapters",
      "tests/acceptance/acceptance-scenarios.json",
      "tests/acceptance/observed-happy-path.json",
    ],
    { cwd: root },
  ).then(
    () => false,
    (error) => {
      if (error.code !== 1) throw error;
      return true;
    },
  );
  assert.equal(contractChanged, false, "revision-bound evidence no longer matches the contract surface");
  const expectedPairs = new Set(
    firstClassTools.flatMap(({ tool }) => expectedScenarioIds.map((scenarioId) => `${tool}:${scenarioId}`)),
  );
  assert.equal(scenarioResults.results.length, expectedPairs.size, "results contain exactly one result for each tool/scenario pair");
  const actualPairs = new Set();
  for (const result of scenarioResults.results) {
    const pair = `${result.tool}:${result.scenarioId}`;
    assert.ok(expectedPairs.has(pair), `result has a known tool/scenario pair: ${pair}`);
    assert.ok(!actualPairs.has(pair), `result is not duplicated: ${pair}`);
    actualPairs.add(pair);
    assert.equal(result.revision, scenarioResults.revision, `result is revision-bound: ${pair}`);
    assert.equal(result.outcome, "pass", `result records an observable passing outcome: ${pair}`);
    assert.match(result.evidence, /^tests\/acceptance\/.+\.(?:json|mjs)$/);
  }
  assert.deepEqual(actualPairs, expectedPairs, "all required tool/scenario pairs are present");
}

async function assertAdapterMetadata() {
  for (const { adapter } of firstClassTools) {
    const [profile, installer] = await Promise.all([
      readFile(resolve(root, `adapters/${adapter}/CAPABILITY.md`), "utf8"),
      readFile(resolve(root, `adapters/${adapter}/install.sh`), "utf8"),
    ]);
    assert.match(profile, /^# .+ Capability Profile/m);
    assert.match(profile, /Last verified: \d{4}-\d{2}-\d{2}/);
    assert.match(profile, /## Official sources/);
    assert.match(profile, /https:\/\//);
    assert.match(profile, /## Verified/);
    assert.match(profile, /## Conservative behavior/);
    assert.match(installer, /skills\/meta-prompt/);
    assert.match(installer, /ln -s/);
  }

  const [codexManifest, claudeManifest] = await Promise.all([
    readFile(resolve(root, "adapters/codex/plugin/.codex-plugin/plugin.json"), "utf8"),
    readFile(resolve(root, "adapters/claude/plugin/.claude-plugin/plugin.json"), "utf8"),
  ]);
  assert.equal(JSON.parse(codexManifest).skills, "../../../skills");
  assert.equal(JSON.parse(claudeManifest).name, "meta-prompt");
  assert.equal(
    await realpath(resolve(root, "adapters/claude/plugin/skills/meta-prompt")),
    await realpath(canonicalSkillDirectory),
  );
}

async function assertDeterministicCi() {
  const workflow = await readFile(resolve(root, ".github/workflows/cross-tool-contract.yml"), "utf8");
  assert.match(workflow, /node tests\/acceptance\/validate-release-candidate\.mjs/);
  assert.match(workflow, /node tests\/acceptance\/validate-field-evaluation\.mjs/);
  assert.doesNotMatch(workflow, /\b(?:codex|claude|opencode)\s+run\b/i);
}

export async function validateCrossToolContract() {
  const [skill, transcript] = await Promise.all([
    readFile(canonicalSkillFile, "utf8"),
    readFile(resolve(root, "tests/acceptance/observed-happy-path.json"), "utf8"),
  ]);
  const frontmatter = parseFrontmatter(skill);
  assert.equal(frontmatter.name, "meta-prompt");
  assert.match(frontmatter.description, /.+/);
  assert.equal(validateStaticSkillContract(skill).status, "PASS");
  assert.equal(validateObservedTranscript(JSON.parse(transcript).turns).status, "PASS");
  await Promise.all([
    validateCodexAdapter(),
    validateClaudeAdapter(),
    validateOpenCodeAdapter(),
    assertDocumentationLinks(),
    assertMatrixCoverage(),
    assertAdapterMetadata(),
    assertDeterministicCi(),
  ]);
  await assertUnifiedInstallation();
  await assertPerToolInstallersRejectMissingProject();
  await assertNoAdapterWorkflowCopies(resolve(root, "adapters"));
  await assertDuplicateDetection();
  return {
    status: "PASS",
    canonicalScenarioCount: expectedScenarioIds.length,
    firstClassToolCount: firstClassTools.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validateCrossToolContract();
  console.log(
    `cross-tool contract: ${result.status} (${result.canonicalScenarioCount} canonical scenarios across ${result.firstClassToolCount} linked First-Class Tools)`,
  );
}
