import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const acceptanceDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(acceptanceDirectory, "../..");

export function runCanonicalAcceptanceScenario({ skill, scenario }) {
  let dumpOpen = true;
  let signalSeen = false;
  let alignmentApproved = false;
  let targetConfirmed = false;
  let qualityGateSeen = false;
  let clarificationCount = 0;

  const section = (heading) => {
    const start = skill.indexOf(`## ${heading}`);
    assert.notEqual(start, -1, `canonical skill is missing ${heading}`);
    const next = skill.indexOf("\n## ", start + 1);
    return skill.slice(start, next === -1 ? undefined : next);
  };
  const normalized = (text) => text.replace(/\s+/g, " ");

  const introduction = normalized(section("Introduction"));
  const contextDump = normalized(section("Context Dump"));
  const completion = normalized(section("Completion"));
  const clarification = normalized(section("Clarification Loop"));
  const alignment = normalized(section("Alignment Gate"));
  const generationAndQualityGate = normalized(section("Generation and Quality Gate"));
  const delivery = normalized(section("Delivery"));

  assert.match(introduction, /multi-message Context Dump/i);
  assert.match(introduction, /덤프 끝/);
  assert.match(introduction, /dump complete/i);
  assert.match(contextDump, /do exactly two things/i);
  assert.match(contextDump, /receipt acknowledgement/i);
  assert.match(contextDump, /do not analyse, design, generate, or implement/i);
  assert.match(contextDump, /do not infer completion/i);
  assert.match(completion, /Target Tool/i);
  assert.match(completion, /Prompt Budget/i);
  assert.match(clarification, /exactly one decision question per turn/i);
  assert.match(clarification, /recommended answer/i);
  assert.match(alignment, /at least one observable Acceptance Criterion exists/i);
  assert.match(alignment, /explicit approval/i);
  assert.match(alignment, /do not generate, draft, or outline a Final Prompt before approval/i);
  assert.match(generationAndQualityGate, /After explicit Alignment Gate approval/i);
  assert.match(generationAndQualityGate, /mandatory Quality Gate/i);
  assert.match(delivery, /exactly these three separately labelled artifacts, in this order/i);
  assert.match(delivery, /English Final Prompt[\s\S]*Review Translation[\s\S]*Run Instructions/);
  assert.match(delivery, /Korean rendering/i);
  assert.match(delivery, /Fresh Run/i);
  assert.match(delivery, /only the English Final Prompt/i);

  const expectedKinds = [
    "introduction",
    "context-dump",
    "receipt",
    "context-dump",
    "receipt",
    "dump-complete",
    "target-confirmation",
    "target-confirmation-response",
    "clarification",
    "clarification-response",
    "clarification",
    "alignment-gate",
    "alignment-approval",
    "quality-gate",
    "delivery",
  ];
  assert.deepEqual(
    scenario.events.map(({ kind }) => kind),
    expectedKinds,
    "happy path must cover the complete ordered vertical slice",
  );

  for (const [index, event] of scenario.events.entries()) {
    if (event.actor === "user" && event.kind === "context-dump") {
      assert.equal(
        signalSeen,
        false,
        `context dump event ${index} occurs after completion`,
      );
      continue;
    }

    if (event.actor === "skill" && event.kind === "receipt") {
      assert.equal(dumpOpen, true, `receipt ${index} occurs after completion`);
      assert.equal(
        signalSeen,
        false,
        `receipt ${index} occurs after the Dump Complete Signal`,
      );
      continue;
    }

    if (event.actor === "user" && event.kind === "dump-complete") {
      assert.equal(dumpOpen, true, "completion signal must close an open dump");
      assert.match(event.text, /덤프 끝|dump complete/i);
      dumpOpen = false;
      signalSeen = true;
      continue;
    }

    if (event.actor === "skill" && event.kind === "target-confirmation") {
      assert.equal(signalSeen, true, "target confirmation requires completion");
      targetConfirmed = true;
    }

    if (event.actor === "user" && event.kind === "target-confirmation-response") {
      assert.equal(targetConfirmed, true, "Target Tool and Prompt Budget require confirmation");
      assert.match(event.text, /Target Tool/i);
      assert.match(event.text, /Prompt Budget/i);
    }

    if (event.actor === "skill" && event.kind === "alignment-gate") {
      assert.equal(signalSeen, true, "alignment requires completion");
      assert.equal(alignmentApproved, false, "alignment cannot repeat after approval");
    }

    if (event.actor === "user" && event.kind === "alignment-approval") {
      assert.equal(alignmentApproved, false, "alignment approval is explicit once");
      assert.match(event.text, /approve/i);
      alignmentApproved = true;
      continue;
    }

    if (event.actor === "skill" && event.kind === "clarification") {
      assert.equal(targetConfirmed, true, "clarification requires target confirmation");
      assert.equal(event.questionCount, 1, "clarification must ask one decision at a time");
      clarificationCount += 1;
    }

    if (event.actor === "skill" && event.kind === "quality-gate") {
      assert.equal(alignmentApproved, true, "quality gate requires alignment approval");
      assert.equal(targetConfirmed, true, "quality gate requires target confirmation");
      assert.equal(clarificationCount >= 2, true, "scenario must exercise the clarification loop");
      qualityGateSeen = true;
    }

    if (event.actor === "skill" && event.kind === "delivery") {
      assert.equal(alignmentApproved, true, "delivery requires alignment approval");
      assert.equal(qualityGateSeen, true, "delivery requires a preceding Quality Gate");
    }

    const phaseInstructions = {
      introduction,
      receipt: contextDump,
      "target-confirmation": completion,
      clarification,
      "alignment-gate": alignment,
      "quality-gate": generationAndQualityGate,
      delivery,
    }[event.kind] ?? skill;

    for (const requirement of event.requires ?? []) {
      assert.match(
        phaseInstructions,
        new RegExp(requirement.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        `${event.kind} requirement is absent from its canonical phase instructions: ${requirement}`,
      );
    }
  }

  assert.equal(dumpOpen, false, "scenario must close the Context Dump");
  assert.equal(targetConfirmed, true, "scenario must confirm the Target Tool and Prompt Budget");
  assert.equal(clarificationCount >= 2, true, "scenario must ask decisions through the Clarification Loop");
  assert.equal(alignmentApproved, true, "scenario must explicitly approve alignment");
  assert.equal(qualityGateSeen, true, "scenario must run the Quality Gate");
  assert.equal(
    scenario.events.at(-1)?.kind,
    "delivery",
    "scenario must finish with delivery",
  );
  return { status: "PASS", eventCount: scenario.events.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [skill, scenarioJson] = await Promise.all([
    readFile(resolve(repoRoot, "skills/meta-prompt/SKILL.md"), "utf8"),
    readFile(resolve(acceptanceDirectory, "happy-path.json"), "utf8"),
  ]);
  const result = runCanonicalAcceptanceScenario({
    skill,
    scenario: JSON.parse(scenarioJson),
  });
  console.log(`canonical happy-path acceptance: ${result.status} (${result.eventCount} events)`);
}
