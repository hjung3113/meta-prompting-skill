import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const profilePath = resolve(root, "adapters/codex/CAPABILITY.md");
const installerPath = resolve(root, "adapters/codex/install.sh");
const manifestPath = resolve(root, "adapters/codex/plugin/.codex-plugin/plugin.json");
const smokePath = resolve(root, "tests/acceptance/codex-smoke.json");

export async function validateCodexAdapter() {
  const [profile, installer, manifestSource, smokeSource] = await Promise.all([
    readFile(profilePath, "utf8"),
    readFile(installerPath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(smokePath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestSource);
  const smoke = JSON.parse(smokeSource);

  assert.match(profile, /Last verified: 2026-07-22/);
  assert.match(profile, /https:\/\/learn\.chatgpt\.com\/docs\/build-skills/);
  assert.match(profile, /https:\/\/learn\.chatgpt\.com\/docs\/build-plugins/);
  assert.match(profile, /\.agents\/skills/);
  assert.match(profile, /\$meta-prompt/);
  assert.match(profile, /not guaranteed/i);
  assert.match(installer, /ln -s/);
  assert.match(installer, /skills\/meta-prompt/);
  assert.equal(manifest.name, "meta-prompt");
  assert.equal(manifest.skills, "../../../skills");
  await assert.rejects(access(resolve(root, "adapters/codex/plugin/skills/meta-prompt/SKILL.md")));
  assert.equal(smoke.tool, "codex-cli");
  assert.match(smoke.version, /^\d+\.\d+\.\d+$/);
  assert.match(smoke.installation, /install\.sh/);
  assert.equal(smoke.invocation, "$meta-prompt");
  assert.match(smoke.pluginInstallation, /codex plugin add/);
  assert.match(smoke.observation, /.+/);
  assert.match(smoke.limitations, /not guaranteed/i);
  return { status: "PASS" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await validateCodexAdapter();
  console.log(`Codex adapter contract: ${result.status}`);
}
