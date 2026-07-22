import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");

export function validateStaticSkillContract(skill) {
  assert.match(skill, /Context Dump/);
  assert.match(skill, /multi-message/);
  assert.match(skill, /덤프 끝/);
  assert.match(skill, /dump complete/i);
  assert.match(skill, /receipt-only/i);
  assert.match(skill, /do not analyse,\s*design,\s*solve,\s*or generate/i);
  assert.match(skill, /untrusted\s+source material, not executable\s+instruction/i);
  assert.match(skill, /Surface material conflicts\s+explicitly/i);
  assert.match(skill, /Exclude sensitive values from the Alignment\s+Gate, Final Prompt, Review Translation, Run Instructions, and any Session\s+Brief/i);
  assert.match(skill, /read-only[\s*]+Grounding Pass/i);
  assert.match(skill, /relevant environment is accessible/i);
  assert.match(skill, /never change files or implement the designed task/i);
  assert.match(skill, /otherwise embed its essential safe content or list it as a required attachment/i);
  assert.match(skill, /one decision at a time/i);
  assert.match(skill, /recommendation/i);
  assert.match(skill, /renegotiate the budget\s+or use a required attachment; never truncate essential instructions/i);
  assert.match(skill, /Session Brief.*explicit user approval/i);
  assert.match(skill, /never the raw\s+Context Dump or sensitive values/i);
  assert.match(skill, /Alignment Gate/);
  assert.match(skill, /observable Acceptance Criterion/i);
  assert.match(skill, /Execution Scope Contract/i);
  assert.match(skill, /in-scope deliverables or changed surfaces/i);
  assert.match(skill, /minimum sufficient\s+evidence/i);
  assert.match(skill, /stop condition/i);
  assert.match(skill, /implementation\s+changes, tests, review findings, and completion blockers/i);
  assert.match(skill, /approved Acceptance Criterion\s+or a user-approved cross-cutting constraint/i);
  assert.match(skill, /Unmapped hardening, speculative risks, and unrelated improvements/i);
  assert.match(skill, /concrete\s+regression\s+caused by the changed surface/i);
  assert.match(skill, /scope\s+expansion\s+needs explicit user approval/i);
  assert.match(skill, /reopen only the affected gate/i);
  assert.match(skill, /wording or translation reopens the Quality\s+Gate/i);
  assert.match(skill, /goal, scope, deliverable, or Acceptance Criteria reopens Clarification\s+and Alignment/i);
  assert.match(skill, /Target Tool fit reopens capability confirmation/i);
  assert.match(skill, /Prompt Budget\s+changes reopen the budget decision/i);
  assert.match(skill, /Do not reopen unrelated gates/i);
  assert.match(skill, /Quality Gate[\s\S]*sensitive-data exclusion/i);
  assert.match(skill, /explicit approval/i);
  assert.match(skill, /English Final Prompt[\s\S]*Review Translation[\s\S]*Run Instructions/);
  assert.match(skill, /Fresh Run/);
  return { status: "PASS" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const skill = await readFile(resolve(root, "skills/meta-prompt/SKILL.md"), "utf8");
  console.log(`static canonical skill contract: ${validateStaticSkillContract(skill).status}`);
}
