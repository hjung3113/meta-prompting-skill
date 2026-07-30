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

target_skills=(
  "$target_project/.agents/skills/meta-prompt"
  "$target_project/.claude/skills/meta-prompt"
  "$target_project/.opencode/skills/meta-prompt"
)

for target_skill in "${target_skills[@]}"; do
  if [[ -e "$target_skill" || -L "$target_skill" ]]; then
    echo "refusing to replace existing $target_skill" >&2
    exit 73
  fi
done

for target_dir in \
  "$target_project/.agents/skills" \
  "$target_project/.claude/skills" \
  "$target_project/.opencode/skills"; do
  parent=$target_dir
  while [[ "$parent" != "$target_project" ]]; do
    if [[ -e "$parent" && ! -d "$parent" ]]; then
      echo "parent path is not a directory: $parent" >&2
      exit 74
    fi
    parent=$(dirname "$parent")
  done
done

created_links=()
rollback() {
  local target_skill
  for target_skill in "${created_links[@]}"; do
    if [[ -L "$target_skill" ]]; then
      rm "$target_skill"
    fi
  done
}
trap rollback ERR

installers=(
  "$source_root/adapters/codex/install.sh"
  "$source_root/adapters/claude/install.sh"
  "$source_root/adapters/opencode/install.sh"
)

for index in "${!installers[@]}"; do
  "${installers[$index]}" "$target_project"
  created_links+=("${target_skills[$index]}")
done
trap - ERR

echo "installed meta-prompt for Codex, Claude Code, and OpenCode"
