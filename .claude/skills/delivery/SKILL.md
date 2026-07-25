---
name: delivery
description: End-to-end delivery — chain /ship (review → test → commit → open PR) then immediately /review-pr the newly opened PR against the team checklist
allowed-tools: Skill, Read, Grep, Glob, Bash(npm test:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh pr diff:*)
argument-hint: [pr-title]
---

Run these 2 phases in order. Do not skip a phase, and do not enter phase 2 unless phase 1 completed:

## Phase 1 — Ship

Invoke the `ship` skill, passing the PR title "$1" along (if not provided, let ship derive one from the diff), and complete all 5 of ship's steps.

- If ship stops midway (tests red / nothing to commit) → **stop here**, report the cause, do NOT enter phase 2
- If it completes → note the PR number from the URL returned by `gh pr create` (e.g. `.../pull/7` → number 7)

## Phase 2 — Review

Invoke the `review-pr` skill with the PR number from phase 1 and complete the full team-checklist review.

## Final summary

Report overall: PR link · test results · review verdict (APPROVE / REQUEST CHANGES) · if any items failed, list what must be fixed before merge
