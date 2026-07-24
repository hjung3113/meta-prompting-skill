import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStaticSkillContract } from "./acceptance/validate-static-contract.mjs";
import { validateObservedTranscript } from "./acceptance/validate-observed-transcript.mjs";
import { validateCodexAdapter } from "./acceptance/validate-codex-adapter.mjs";
import { validateClaudeAdapter } from "./acceptance/validate-claude-adapter.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [skill, observed] = await Promise.all([
  readFile(resolve(root, "skills/meta-prompt/SKILL.md"), "utf8"),
  readFile(resolve(root, "tests/acceptance/observed-happy-path.json"), "utf8"),
]);

assert.equal(validateStaticSkillContract(skill).status, "PASS");
assert.equal(validateObservedTranscript(JSON.parse(observed).turns).status, "PASS");
assert.equal((await validateCodexAdapter()).status, "PASS");
assert.equal((await validateClaudeAdapter()).status, "PASS");
console.log("meta-prompt Issue 2 contract: PASS");
