#!/bin/bash
# =============================================================================
# format.sh — auto-format files Claude edits, with prettier
#
# WHAT IT DOES
#   Every time Claude Code finishes an Edit or Write tool call, this hook
#   runs prettier on the file that was just changed, so TS/JS code is always
#   formatted to team style without anyone asking for it.
#
# HOW IT WORKS
#   1. Registered in .claude/settings.json under hooks.PostToolUse with
#      matcher "Edit|Write" — Claude Code runs it AFTER each successful
#      Edit/Write, piping the tool-call payload as JSON to stdin:
#        { "tool_name": "Edit",
#          "tool_input":    { "file_path": "/abs/path/file.ts", ... },
#          "tool_response": { "filePath": "/abs/path/file.ts", ... } }
#   2. jq extracts the edited file's path (tool_response first, fallback
#      to tool_input). No path → exit 0 (nothing to do).
#   3. Only *.ts / *.tsx / *.js / *.jsx are formatted; other files pass
#      through untouched.
#   4. Runs `npx prettier --write` from the project root. Errors are
#      swallowed (|| true) and it always exits 0 — a formatter must never
#      block Claude's edit; worst case the file is just left unformatted.
#
# TEST BY HAND
#   echo '{"tool_input":{"file_path":"'$PWD'/src/foo.ts"}}' \
#     | CLAUDE_PROJECT_DIR="$PWD" .claude/hooks/format.sh
# =============================================================================

file_path=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx)
    cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
    npx prettier --write "$file_path" >/dev/null 2>&1 || true
    ;;
esac

exit 0
