#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: adapters/opencode/install.sh <project-directory>" >&2
  exit 64
fi

target_project=$1
source_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
source_skill="$source_root/skills/meta-prompt"
target_dir="$target_project/.opencode/skills"
target_skill="$target_dir/meta-prompt"

if [[ ! -d "$target_project" ]]; then
  echo "project directory does not exist: $target_project" >&2
  exit 66
fi
if [[ ! -f "$source_skill/SKILL.md" ]]; then
  echo "canonical Meta-Prompt skill is missing" >&2
  exit 66
fi

if [[ -e "$target_skill" || -L "$target_skill" ]]; then
  echo "refusing to replace existing $target_skill" >&2
  exit 73
fi

mkdir -p "$target_dir"
ln -s "$source_skill" "$target_skill"
echo "installed $target_skill -> $source_skill"
