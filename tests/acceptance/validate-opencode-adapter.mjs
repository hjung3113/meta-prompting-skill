import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { lstat, mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const profilePath = resolve(root, "adapters/opencode/CAPABILITY.md");
const installerPath = resolve(root, "adapters/opencode/install.sh");
const canonicalSkillPath = resolve(root, "skills/meta-prompt");
const canonicalSkillFile = resolve(canonicalSkillPath, "SKILL.md");
const smokePath = resolve(root, "tests/acceptance/opencode-smoke.json");

async function assertCleanProjectInstall() {
  const project = await mkdtemp(resolve(tmpdir(), "meta-prompt-opencode-"));
  try {
    await execFileAsync("bash", [installerPath, project]);
    const installedSkill = resolve(project, ".opencode/skills/meta-prompt");
    assert.equal((await lstat(installedSkill)).isSymbolicLink(), true);
    assert.equal(await realpath(installedSkill), await realpath(canonicalSkillPath));
    await assert.rejects(
      execFileAsync("bash", [installerPath, project]),
      (error) => error.code === 73,
    );
  } finally {
    await rm(project, { recursive: true, force: true });
  }
}

export async function validateOpenCodeAdapter() {
  const [profile, installer, skill, smokeSource] = await Promise.all([
    readFile(profilePath, "utf8"),
    readFile(installerPath, "utf8"),
    readFile(canonicalSkillFile, "utf8"),
    readFile(smokePath, "utf8"),
  ]);
  const smoke = JSON.parse(smokeSource);

  assert.match(profile, /Last verified: 2026-07-26/);
  assert.match(profile, /https:\/\/opencode\.ai\/docs\/skills/);
  assert.match(profile, /https:\/\/opencode\.ai\/docs\/permissions/);
  assert.match(profile, /\.opencode\/skills/);
  assert.match(profile, /native `skill`\s+tool/);
  assert.match(profile, /does not claim a slash command/i);
  assert.match(profile, /permission\.skill/);
  assert.match(installer, /ln -s/);
  assert.match(installer, /skills\/meta-prompt/);
  assert.match(skill, /^---\nname: meta-prompt\ndescription: .+\n---/);
  assert.equal(smoke.tool, "opencode");
  assert.match(smoke.version, /^\d+\.\d+\.\d+$/);
  assert.equal(smoke.verifiedAt, "2026-07-26");
  assert.match(smoke.installation, /install\.sh/);
  assert.match(smoke.invocation, /meta-prompt/);
  assert.match(smoke.scenario, /Fresh Run/);
  assert.match(smoke.result, /^(PASS|PARTIAL):/);
  assert.match(smoke.limitations, /permission\.skill/);
  assert.match(smoke.limitations, /not verified/i);
  await assertCleanProjectInstall();
  return { status: "PASS" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validateOpenCodeAdapter();
  console.log(`OpenCode adapter contract: ${result.status}`);
}
