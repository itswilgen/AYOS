#!/usr/bin/env bash
# Starts a Claude Code session as an AYOS agent, routed through OmniRoute.
# Usage: .claude/launch-agent.sh frontend|backend|team [extra claude args...]
set -euo pipefail

repo=$(cd "$(dirname "$0")/.." && pwd)
omniroute_url=${OMNIROUTE_URL:-http://localhost:20128}
# OmniRoute combo: Claude Opus first, Codex once Claude hits its usage limit.
frontend_model=${AYOS_FRONTEND_MODEL:-combo/ayos-lead}
backend_model=${AYOS_BACKEND_MODEL:-cx/gpt-6-astra-high}

case "${1:-}" in
  frontend)
    agent=frontend-planner
    model=$frontend_model
    workdir=$repo
    ;;
  backend)
    agent=backend-engineer
    model=$backend_model
    # Starting in backend/ loads its CLAUDE.md, Boost skills, and the laravel-boost MCP.
    workdir=$repo/backend
    ;;
  team)
    agent=feature-lead
    model=$frontend_model
    workdir=$repo
    # backend-engineer asks for the `sonnet` alias, but Claude Code keeps a same-family
    # subagent on the lead's own model, so a Sonnet lead would capture the backend work.
    case "$model" in
      *sonnet*)
        echo "Team mode can't use a Sonnet model as the lead (AYOS_FRONTEND_MODEL=$model)." >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Usage: $0 frontend|backend|team [claude args...]" >&2
    exit 1
    ;;
esac
shift

if [ -z "${OMNIROUTE_API_KEY:-}" ]; then
  echo "OMNIROUTE_API_KEY is not set. Copy your key from $omniroute_url (API Keys) and add 'export OMNIROUTE_API_KEY=...' to ~/.zshrc." >&2
  exit 1
fi

if ! curl -sf --max-time 3 "$omniroute_url/api/monitoring/health" >/dev/null; then
  echo "OmniRoute is not reachable at $omniroute_url. Start it with 'omniroute serve'." >&2
  exit 1
fi

unset ANTHROPIC_API_KEY
export ANTHROPIC_BASE_URL=$omniroute_url
export ANTHROPIC_AUTH_TOKEN=$OMNIROUTE_API_KEY
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1
# Every request resends the whole conversation, so compact well before the 1M window
# and skip the background next-prompt suggestion call.
export CLAUDE_CODE_AUTO_COMPACT_WINDOW=200000
export CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=false
# Built-in subagents and background calls use these aliases; keep them on a model OmniRoute serves.
export ANTHROPIC_DEFAULT_OPUS_MODEL=$model
export ANTHROPIC_DEFAULT_SONNET_MODEL=$model
export ANTHROPIC_DEFAULT_HAIKU_MODEL=$model

set -- --agent "$agent" --model "$model" "$@"
if [ "$agent" = feature-lead ]; then
  export ANTHROPIC_DEFAULT_SONNET_MODEL=$backend_model
  # The backend agent runs from the repo root here, so load laravel-boost for this session.
  # --mcp-config takes several values, so it goes before the other flags.
  set -- --mcp-config '{"mcpServers":{"laravel-boost":{"command":"php","args":["backend/artisan","boost:mcp"]}}}' "$@"
fi

cd "$workdir"
exec claude "$@"
