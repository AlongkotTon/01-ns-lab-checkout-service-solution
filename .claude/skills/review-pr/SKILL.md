---
name: review-pr
description: Review a PR by number, going through the team's review checklist item by item
allowed-tools: Read, Grep, Glob, Bash(gh pr view:*), Bash(gh pr diff:*)
argument-hint: <pr-number>
---

Review PR #$1 of this repo

## PR diff (fetched live)

!`gh pr diff $1`

## Team checklist

@docs/review-checklist.md

## How to review

1. Read the diff above across every file. If more context is needed, Read the actual files in the repo.
2. Go through the checklist item by item (C1–C8) — for every item state **pass / fail / not applicable to this PR**, citing file:line from the diff as evidence.
3. End the review with:
   - A list of failing items with suggested fixes
   - Verdict: **APPROVE** (all items pass) or **REQUEST CHANGES** (any item fails)
