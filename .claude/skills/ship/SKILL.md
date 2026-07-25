---
name: ship
description: Review the current work, run tests, then commit + open a PR once everything is green
allowed-tools: Read, Grep, Glob, Bash(npm test:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(gh pr create:*)
argument-hint: [pr-title]
---

Follow these steps in order — do not skip any step:
1. Look at the current diff: !`git diff`
2. Review for obvious bugs / leaked secrets / code that violates team conventions
3. Run `npm test` — if red, stop, report the cause, and do NOT commit
4. If everything is green: `git add` only the relevant files, commit with a short clear message
5. Open a PR titled "$1" (if not provided, derive one from the diff) with a summary of what/why
