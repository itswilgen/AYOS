#!/usr/bin/env bash
# PreToolUse guard: blocks Edit/Write to repo paths outside this agent's lane.
# Usage: lane-guard.sh <allowed path prefix>...
set -euo pipefail

root=$(git rev-parse --show-toplevel)
file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -n "$file" ] || exit 0

case "$file" in
  /*) ;;
  *) file="$PWD/$file" ;;
esac

# `backend/../src` would otherwise pass as a backend path.
case "$file" in
  */../* | */.. | */./* | */.)
    echo "Blocked: use a normalized absolute path instead of $file." >&2
    exit 2
    ;;
esac

# Paths outside the repo (plans, memory) are not this guard's concern.
case "$file" in
  "$root"/*) rel=${file#"$root"/} ;;
  *) exit 0 ;;
esac

for lane in "$@"; do
  case "$rel" in
    "$lane" | "$lane"/*) exit 0 ;;
  esac
done

echo "Blocked: $rel is outside this agent's lane ($*). Hand it to the other agent instead." >&2
exit 2
