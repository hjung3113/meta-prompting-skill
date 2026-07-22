# Codex Capability Profile

Last verified: 2026-07-22

## Official sources

- [Build skills](https://learn.chatgpt.com/docs/build-skills): Codex discovers
  repository skills under `.agents/skills`, and a skill is a directory with a
  `SKILL.md` containing `name` and `description`.
- [Build skills](https://learn.chatgpt.com/docs/build-skills): in Codex CLI,
  users can explicitly invoke a skill with a `$` mention; implicit selection is
  description-based and is not guaranteed for a particular request.
- [Build plugins](https://learn.chatgpt.com/docs/build-plugins): plugins may
  package skills and are installed through a configured marketplace.

## Verified adapter

- Install the canonical skill into a clean Codex project with
  `adapters/codex/install.sh <project-directory>`. The installer creates a
  symlink at `<project-directory>/.agents/skills/meta-prompt`; the canonical
  source remains `skills/meta-prompt/SKILL.md` in this repository.
- Start a new Codex CLI session in that project and invoke `$meta-prompt`
  explicitly. The skill description may support implicit selection, but this
  adapter does not claim that automatic selection will occur.
- The secondary plugin path is `.agents/plugins/marketplace.json` plus
  `adapters/codex/plugin/.codex-plugin/plugin.json`. Its `skills` metadata
  points to the canonical repository `skills/` directory and contains no
  workflow copy.

## Conservative behavior

- Plugin availability depends on the configured marketplace and current Codex
  surface. If it is unavailable, use the direct installer and state that the
  plugin path was not verified in that environment.
- Start a Fresh Run after installation. Do not claim that a plugin install can
  retrofit an already-running conversation.
- Run Instructions must name any Context Asset that the Target Tool cannot
  access as a required attachment rather than promising unsupported access.
