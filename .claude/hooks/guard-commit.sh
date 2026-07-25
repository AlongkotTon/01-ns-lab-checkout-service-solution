#!/bin/bash
# PreToolUse hook (matcher: Bash) — บล็อก git commit ถ้า typecheck ไม่ผ่าน
# exit 2 = บล็อก tool call และส่ง stderr กลับให้ Claude แก้ให้เขียวก่อน

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
