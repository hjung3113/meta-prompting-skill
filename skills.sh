#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: ./skills.sh <project-directory>" >&2
  exit 64
fi

target_project=$1
source_root=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

if [[ ! -d "$target_project" ]]; then
  echo "project directory does not exist: $target_project" >&2
  exit 66
fi

for target_skill in \
  "$target_project/.agents/skills/meta-prompt" \
  "$target_project/.claude/skills/meta-prompt" \
  "$target_project/.opencode/skills/meta-prompt"; do
  if [[ -e "$target_skill" || -L "$target_skill" ]]; then
    echo "refusing to replace existing $target_skill" >&2
    exit 73
  fi
done

for installer in \
  "$source_root/adapters/codex/install.sh" \
  "$source_root/adapters/claude/install.sh" \
  "$source_root/adapters/opencode/install.sh"; do
  "$installer" "$target_project"
done

echo "installed meta-prompt for Codex, Claude Code, and OpenCode"
