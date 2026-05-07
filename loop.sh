#!/usr/bin/env bash
# Ralph-style outer loop: feed a fixed prompt file to a headless agent CLI, repeatedly.
# Each iteration should complete one IMPLEMENTATION_PLAN task and exit so the next
# iteration starts with a fresh context window. Project policy (see AGENTS.md): agents
# in Cursor must not commit until the user says so; headless runs may still follow
# PROMPT_build.md if your CLI workflow includes an explicit commit step you control.
#
# Usage:
#   ./loop.sh              # build mode, unlimited iterations
#   ./loop.sh 20           # build mode, max 20 iterations
#   ./loop.sh plan         # plan mode, unlimited iterations
#   ./loop.sh plan 5       # plan mode, max 5 iterations
#
# Required: set RALPH_FEED_CMD to a shell command that reads the prompt from stdin.
# Examples (pick one that matches your toolchain):
#   export RALPH_FEED_CMD='claude -p --dangerously-skip-permissions --verbose'
#   export RALPH_FEED_CMD='cursor agent run -f /dev/stdin'  # illustrative only; confirm against your Cursor CLI
#
# Optional:
#   RALPH_AUTO_PUSH=1      # git push after each successful iteration (needs remote)
#
# First run: chmod +x loop.sh

set -euo pipefail

if [[ -z "${RALPH_FEED_CMD:-}" ]]; then
  echo "Error: RALPH_FEED_CMD is not set." >&2
  echo "Export a command that reads the prompt on stdin (see header comments in loop.sh)." >&2
  echo "See AGENTS.md → Ralph loop." >&2
  exit 1
fi

if [[ "${1:-}" == "plan" ]]; then
  MODE="plan"
  PROMPT_FILE="PROMPT_plan.md"
  MAX_ITERATIONS="${2:-0}"
else
  MODE="build"
  PROMPT_FILE="PROMPT_build.md"
  if [[ "${1:-}" =~ ^[0-9]+$ ]]; then
    MAX_ITERATIONS="$1"
  else
    MAX_ITERATIONS="0"
  fi
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "Error: $PROMPT_FILE not found" >&2
  exit 1
fi

ITERATION=0
CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || echo "unknown")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Mode:   $MODE"
echo "Prompt: $PROMPT_FILE"
echo "Branch: $CURRENT_BRANCH"
if [[ "$MAX_ITERATIONS" -gt 0 ]]; then
  echo "Max:    $MAX_ITERATIONS iterations"
fi
echo "Feed:   $RALPH_FEED_CMD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

while true; do
  if [[ "$MAX_ITERATIONS" -gt 0 && "$ITERATION" -ge "$MAX_ITERATIONS" ]]; then
    echo "Reached max iterations: $MAX_ITERATIONS"
    break
  fi

  # shellcheck disable=SC2086
  cat "$PROMPT_FILE" | eval "$RALPH_FEED_CMD"

  if [[ "${RALPH_AUTO_PUSH:-0}" == "1" ]]; then
    git push origin "$CURRENT_BRANCH" || {
      echo "Note: git push failed (no remote or auth). Skipping."
    }
  fi

  ITERATION=$((ITERATION + 1))
  echo -e "\n\n======================== LOOP $ITERATION ========================\n"
done
