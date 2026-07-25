#!/bin/bash
# =============================================================================
# guard-commit.sh — block `git commit` while the codebase has type errors
#
# WHAT IT DOES
#   Acts as a commit gate: whenever Claude Code is about to run a Bash
#   command containing `git commit`, this hook first runs the TypeScript
#   typecheck. Red typecheck → the commit is blocked and the errors are fed
#   back to Claude so it fixes them and retries; green → commit proceeds.
#
# HOW IT WORKS
#   1. Registered in .claude/settings.json under hooks.PreToolUse with
#      matcher "Bash" — Claude Code runs it BEFORE every Bash tool call,
#      piping the pending command as JSON to stdin:
#        { "tool_name": "Bash", "tool_input": { "command": "git commit -m ..." } }
#   2. jq extracts .tool_input.command; anything not containing
#      "git commit" exits 0 immediately (no typecheck cost on normal
#      commands).
#   3. For a commit: runs `npx tsc --noEmit` from the project root.
#   4. Exit codes are the contract with Claude Code:
#        exit 0 → allow the tool call to run
#        exit 2 → BLOCK the tool call; everything printed to stderr is
#                 returned to Claude as the reason, so it sees the exact
#                 type errors, fixes them, and only then commits.
#
# TEST BY HAND
#   echo '{"tool_input":{"command":"git commit -m test"}}' \
#     | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/guard-commit.sh; echo "exit=$?"
#   (plant a type error in src/ first to see the blocking path: exit=2)
# =============================================================================

command=$(jq -r '.tool_input.command // empty')

case "$command" in
  *"git commit"*)
    cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
    typecheck_output=$(npx tsc --noEmit 2>&1)
    if [ $? -ne 0 ]; then
      echo "❌ BLOCKED: git commit ถูกยกเลิกเพราะ typecheck (tsc --noEmit) ไม่ผ่าน" >&2
      echo "แก้ type error ด้านล่างให้เขียวก่อน แล้วค่อย commit ใหม่:" >&2
      echo "$typecheck_output" >&2
      exit 2
    fi
    ;;
esac

exit 0
