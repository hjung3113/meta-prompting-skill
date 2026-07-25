# OpenCode Capability Profile

Last verified: 2026-07-26

## Official sources

- [Agent Skills](https://opencode.ai/docs/skills): project skills are
  discovered at `.opencode/skills/<name>/SKILL.md`; the documented
  Claude-compatible and agent-compatible locations are alternatives, not
  required for this adapter.
- [Agent Skills](https://opencode.ai/docs/skills): `SKILL.md` requires YAML
  frontmatter with `name` and `description`; the name must match its directory
  and use lowercase alphanumeric words separated by single hyphens.
- [Permissions](https://opencode.ai/docs/permissions): the `skill` permission
  controls whether an agent can load a skill, using `allow`, `ask`, or `deny`.

## Verified installation and discovery

- Run `adapters/opencode/install.sh <project-directory>` to symlink the
  canonical `skills/meta-prompt` directory into a clean project's
  `.opencode/skills/meta-prompt` location. The canonical source remains
  `skills/meta-prompt/SKILL.md` in this repository.
- OpenCode 1.17.13 discovered that symlinked skill at
  `.opencode/skills/meta-prompt/SKILL.md` in a clean Git project. In a Fresh
  Run, ask OpenCode to use the `meta-prompt` skill; OpenCode exposes available
  skills to the agent and loads the selected skill through its native `skill`
  tool. This adapter does not claim a slash command or automatic selection for
  unrelated requests.
- The canonical `meta-prompt` name and its required `name` and `description`
  frontmatter satisfy the documented OpenCode skill contract.

## Conservative behavior

- A project or agent configuration can set `permission.skill` to `ask` or
  `deny`. Approve the requested `meta-prompt` skill load when it is `ask`; if
  it is `deny`, change the configuration or use another supported host rather
  than claiming the skill loaded.
- Start a Fresh Run after installation. Do not claim that installation changes
  an already-running conversation.
- The 2026-07-26 Fresh Run reached the configured Z.AI model but could not
  observe skill behavior because the provider reported insufficient balance.
  Treat agent behavior as unverified until a configured provider completes the
  scenario successfully.
- Run Instructions must name any Context Asset that the Target Tool cannot
  access as a required attachment rather than promising unsupported access.
