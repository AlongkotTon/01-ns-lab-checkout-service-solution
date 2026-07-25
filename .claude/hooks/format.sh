#!/bin/bash
# PostToolUse hook (matcher: Edit|Write) — auto-format ไฟล์ที่ Claude แก้ด้วย prettier
# รับ JSON ทาง stdin: { tool_name, tool_input: { file_path, ... }, tool_response: { filePath, ... } }

file_path=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx)
    cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0
    npx prettier --write "$file_path" >/dev/null 2>&1 || true
    ;;
esac

exit 0
