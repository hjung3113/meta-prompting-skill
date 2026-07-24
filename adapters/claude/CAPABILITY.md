# Claude Code Capability Profile

Last verified: 2026-07-25

## Official sources

- [Extend Claude with skills](https://code.claude.com/docs/en/skills): project skills live at `.claude/skills/<skill-name>/SKILL.md`, can be invoked as `/skill-name`, and may symlink to a skill directory.
- [Create plugins](https://code.claude.com/docs/en/plugins): a plugin's `.claude-plugin/plugin.json` supplies its identity and the plugin-root `skills/<skill-name>/SKILL.md` layout is invoked as `/plugin-name:skill-name`.
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference): local and installed plugins have symlink-resolution limits, so a plugin must not promise that an external link will remain portable after caching or installation.

## Verified adapter

- Run `adapters/claude/install.sh <project-directory>` to symlink the canonical `skills/meta-prompt` directory into a clean project's `.claude/skills/meta-prompt` location, then start a Fresh Run and invoke `/meta-prompt`.
- The secondary plugin at `adapters/claude/plugin` has a documented `.claude-plugin/plugin.json` manifest and its `skills/meta-prompt` entry is a symlink to the same canonical directory. Claude Code 2.1.218 registered it as `meta-prompt@inline` when loaded with `--plugin-dir` in a Fresh Run and accepted `/meta-prompt:meta-prompt`.

## Conservative behavior

The observed local plugin behavior is not a portable marketplace-install guarantee: current plugin documentation limits external symlinks during local loading and cache installation. Use the direct project installer as the supported path and report unavailable plugin access in Run Instructions. Always use a Fresh Run; do not claim that installation changes an already-running conversation.
