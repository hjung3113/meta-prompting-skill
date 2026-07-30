import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const profilePath = resolve(root, "adapters/claude/CAPABILITY.md");
const installerPath = resolve(root, "adapters/claude/install.sh");
const manifestPath = resolve(root, "adapters/claude/plugin/.claude-plugin/plugin.json");
const pluginSkillPath = resolve(root, "adapters/claude/plugin/skills/meta-prompt");
const canonicalSkillPath = resolve(root, "skills/meta-prompt");
const smokePath = resolve(root, "tests/acceptance/claude-smoke.json");

async function assertCleanProjectInstall(installerPath) {
  const project = await mkdtemp(resolve(tmpdir(), "meta-prompt-claude-"));
  try {
    await execFileAsync("bash", [installerPath, project]);
    const installedSkill = resolve(project, ".claude/skills/meta-prompt");
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

export async function validateClaudeAdapter() {
  const [profile, installer, manifestSource, smokeSource] = await Promise.all([
    readFile(profilePath, "utf8"),
    readFile(installerPath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(smokePath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);
  const smoke = JSON.parse(smokeSource);

  assert.match(profile, /Last verified: 2026-07-25/);
  assert.match(profile, /https:\/\/code\.claude\.com\/docs\/en\/skills/);
  assert.match(profile, /https:\/\/code\.claude\.com\/docs\/en\/plugins/);
  assert.match(profile, /https:\/\/code\.claude\.com\/docs\/en\/plugins-reference/);
  assert.match(profile, /\.claude\/skills/);
  assert.match(profile, /\/meta-prompt/);
  assert.match(profile, /\/meta-prompt:meta-prompt/);
  assert.match(profile, /Fresh Run/);
  assert.match(profile, /not a portable marketplace-install guarantee/);
  assert.match(installer, /ln -s/);
  assert.match(installer, /skills\/meta-prompt/);
  assert.doesNotMatch(installer, /\\\$\{BASH_SOURCE/);
  assert.equal(manifest.name, "meta-prompt");
  assert.equal(typeof manifest.version, "string");
  assert.equal(typeof manifest.description, "string");
  assert.equal((await lstat(pluginSkillPath)).isSymbolicLink(), true);
  assert.equal(await realpath(pluginSkillPath), await realpath(canonicalSkillPath));
  assert.equal(smoke.tool, "claude-code");
  assert.equal(smoke.version, "2.1.218");
  assert.equal(smoke.verifiedAt, "2026-07-25");
  assert.match(smoke.installation, /install\.sh/);
  assert.equal(smoke.invocation, "/meta-prompt");
  assert.equal(smoke.pluginInvocation, "/meta-prompt:meta-prompt");
  assert.match(smoke.scenario, /non-persistent Fresh Run/);
  assert.match(smoke.scenario, /--plugin-dir/);
  assert.match(smoke.observation, /.+/);
  assert.match(smoke.limitations, /plugin/i);
  assert.match(smoke.limitations, /not a portable marketplace-install guarantee/);
  await assertCleanProjectInstall(installerPath);
  return { status: "PASS" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validateClaudeAdapter();
  console.log(`Claude adapter contract: ${result.status}`);
}
