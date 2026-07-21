# Meta-Prompting

This project turns a user's unrefined working context into an execution-ready prompt while preserving one consistent method across coding-agent tools.

## Language

**Meta-Prompt**:
The product and skill that runs a Refinement Session. Its canonical invocation name is `meta-prompt` across all First-Class Tools.
_Avoid_: Prompt refiner, meta-prompting skill, prompt generator

**Shared Workflow**:
The tool-independent method that guides a user from raw context through clarification and refinement to a final prompt.
_Avoid_: Core, common prompt, base implementation

**Tool Adapter**:
A tool-specific expression of the Shared Workflow that fits the invocation and capability model of one coding-agent tool without redefining the method.
_Avoid_: Fork, separate implementation, tool version

**Refinement Session**:
One guided conversation that carries the user from context dumping through clarification to a final prompt without requiring separate stage commands.
_Avoid_: Wizard, pipeline run, prompt generation

**Context Dump**:
The user's unstructured, potentially multi-message input supplied before the system is allowed to interpret, narrow, or solve the task.
_Avoid_: Brief, requirements, prompt

**Dump Complete Signal**:
An explicit phrase such as `덤프 끝` that ends the Context Dump and permits clarification to begin. Every Refinement Session must introduce this signal before accepting the dump.
_Avoid_: Automatic completion, inferred readiness

**Clarification Loop**:
An adaptive sequence of one-at-a-time questions that resolves every material decision left open by the Context Dump. Each question includes a recommended answer, and facts available from the environment are investigated instead of asked.
_Avoid_: Questionnaire, question batch, intake form

**Alignment Gate**:
A user-approved summary of the goal, deliverable, scope, exclusions, constraints, success conditions, failure conditions, and remaining assumptions. Refinement cannot begin until the user approves it.
_Avoid_: Automatic convergence, internal summary, silent approval

**Final Prompt**:
The paste-ready English instruction produced after the Alignment Gate, containing only what the Target Tool needs in a fresh conversation.
_Avoid_: Draft, summary, runbook

**Review Translation**:
A Korean rendering of the Final Prompt shown separately so the user can verify its meaning. It is not part of the Prompt Budget and is not pasted into the Fresh Run.
_Avoid_: Bilingual execution prompt, second prompt, embedded translation

**Run Instructions**:
Guidance kept outside the Final Prompt that tells the user where and how to run it, what context to attach, and how to verify the result.
_Avoid_: Prompt preamble, embedded usage notes

**First-Class Tool**:
A coding-agent tool with a dedicated Tool Adapter whose installation, invocation, and Refinement Session have been directly verified by this project.
_Avoid_: Compatible tool, theoretically supported tool

**Portable Fallback**:
A tool-neutral expression of the Shared Workflow for agents without a directly verified Tool Adapter.
_Avoid_: First-class support, universal integration

**Target Tool**:
The coding agent that will execute the Final Prompt. It defaults to the host of the Refinement Session but is explicitly confirmed after the Dump Complete Signal and may differ from that host.
_Avoid_: Current agent, host tool, assumed runtime

**Prompt Budget**:
The confirmed size limit for the English Final Prompt, supplied by the user or recommended by the Tool Adapter. It is satisfied by prioritised refinement rather than truncation, and must be renegotiated when essential instructions cannot fit safely.
_Avoid_: Token cutoff, arbitrary character limit, truncation target

**Acceptance Criteria**:
Observable conditions that let the executing agent and user determine whether the requested result is complete. At least one verified criterion is required before the Alignment Gate can pass.
_Avoid_: Quality goal, aspiration, subjective polish

**Fresh Run**:
Execution of the Final Prompt in a new conversation without the exploratory Refinement Session in its history. Every Run Instructions output requires a Fresh Run.
_Avoid_: Continue here, reuse this chat, execute inline

**Prompt Contract**:
The semantic structure every Final Prompt preserves: goal, context and inputs, deliverable, requirements, exclusions, working rules, Acceptance Criteria, and verification. A Tool Adapter may change or compress the presentation but not silently remove these meanings.
_Avoid_: Template, fixed headings, formatting style

**Instruction Boundary**:
The separation between user-confirmed directives and untrusted source material inside a Context Dump. Source material is evidence, not executable instruction, until the user confirms its meaning during the Clarification Loop or Alignment Gate.
_Avoid_: Treat all pasted text as instructions, silent conflict resolution

**Session Brief**:
An optional, user-approved persistence artifact for a long Refinement Session, containing structured agreements, unresolved questions, and Acceptance Criteria rather than the raw Context Dump.
_Avoid_: Automatic transcript, raw dump archive, hidden state file

**Quality Gate**:
A second-pass check that a generated Final Prompt matches the approved Alignment Gate, satisfies the Prompt Contract and Prompt Budget, fits the Target Tool, excludes sensitive data, and remains executable. Failed checks are repaired before output.
_Avoid_: Self-critique transcript, optional review, unchecked generation

**Context Asset**:
A file or other resource needed by the Final Prompt. It is referenced by path only when the Target Tool can access the same environment; otherwise its essential content is embedded or listed as a required attachment in Run Instructions.
_Avoid_: Assumed file access, blind path reference, unnecessary full copy

**Distribution Package**:
The installable form of the Shared Workflow: one canonical skill, tool-native manifests for first-class distribution, and deterministic validation scripts. Separate agents or commands are added only when a verified tool limitation requires them.
_Avoid_: Independent tool implementations, duplicated workflow files, agent-first architecture

**Primary Installer**:
The `skills.sh` installation path that installs the canonical `meta-prompt` skill for Codex, Claude Code, and OpenCode in one command. Native plugin packages are secondary distribution paths for marketplace and managed-update use cases.
_Avoid_: Manual copy as default, plugin-only install, separate per-tool setup

**Acceptance Scenario**:
A tool-independent conversation case used to verify phase transitions and required behaviours across First-Class Tools. It is judged by observable outcomes rather than exact model wording.
_Avoid_: Golden transcript, exact-output snapshot, model benchmark

**Guided Default**:
A recommended choice that lets a novice continue without prompt-engineering knowledge while remaining explicitly overridable by an expert user. Advanced options are surfaced only when the active decision requires them.
_Avoid_: Fixed policy, upfront options dump, unexplained assumption

**Agent-Executable Task**:
Any coding, planning, research, documentation, analysis, or automation task that a Target Tool can carry out through its conversation and available tools. Meta-Prompt is not limited to writing code, but v1 does not claim first-class support for non-coding-agent environments.
_Avoid_: Coding-only task, universal AI task, unsupported runtime

**Capability Profile**:
A sourced, last-verified description of a First-Class Tool's relevant invocation, context, and execution capabilities. Live environment evidence overrides the profile; stale or unavailable evidence triggers conservative behaviour and an explicit Run Instructions note.
_Avoid_: Hardcoded model assumptions, timeless compatibility claim, guessed feature

**Grounding Pass**:
A read-only investigation after the Dump Complete Signal that resolves facts available from the relevant workspace or environment before the Clarification Loop asks the user. It never implements the task being designed.
_Avoid_: Premature implementation, dump-time analysis, asking discoverable facts
