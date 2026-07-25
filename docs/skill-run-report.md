# Skill Run Report — checkout-service team tooling

Date: 2026-07-25 · Branch: `add-ship-skill` · Runner: Claude Code (Lab A Day 2)

End-to-end test run of the three team skills: `/ship`, `/review-pr`, `/delivery`.

---

## 1. `/ship`

**Result: ✅ behaved correctly — halted without committing (nothing shippable)**

| Step | Outcome |
|---|---|
| 1. `git diff` (auto-injected) | Only a binary `.DS_Store` change — no source changes |
| 2. Review | No bugs / secrets / convention violations (nothing to review) |
| 3. `npm test` | **29/29 pass** (6 suites) |
| 4. Commit | Skipped — `.DS_Store` is macOS junk, not a relevant file; "add only relevant files" rule correctly left nothing to commit |
| 5. PR | Not reached |

Earlier in the session `/ship` also completed a full green path: committed the skill file and opened fork PR [#1](https://github.com/AlongkotTon/01-ns-lab-checkout-service-solution/pull/1). The red path (tests failing → block) is enforced separately by the `guard-commit.sh` PreToolUse hook, verified with a planted type error → commit blocked with exit 2.

## 2. `/review-pr 2` (upstream PR: "Bug fixes, Swagger UI, and refactor")

**Result: ✅ full checklist review completed — verdict APPROVE (with 3 notes)**

| Item | Verdict | Evidence |
|---|---|---|
| C1 money is integer cents | ✅ pass | All new pricing math stays integer (`breakdownFor` in `src/services/pricingService.ts`); no floats introduced |
| C2 edge cases tested | ✅ pass | +6 tests: non-positive quantity (`inventory.test.ts`), idempotency-key mismatch (`checkoutFeature.test.ts`), e2e status codes (`app.test.ts`) |
| C3 error handling / status codes | ✅ pass | New `src/lib/errors.ts` (`HttpError`/404/409); `errorHandler.ts` honors `err.status`, falls back to 400 |
| C4 no secrets in diff | ✅ pass | None found |
| C5 input validated | ✅ pass | `reserve`/`release` reject `quantity <= 0`; unknown SKU → 404 via `getProductOrThrow` |
| C6 naming conventions | ✅ pass | camelCase/PascalCase respected; new test in `src/__tests__/app.test.ts` |
| C7 no `any` / stray `console.log` | ✅ pass | None in diff |
| C8 commit message quality | ✅ pass | PR title/description describe what & why |

**Notes (non-blocking):**
1. `package-lock.json` mixes registries — new packages resolve from `repo.huaweicloud.com` mirror while the rest use `registry.npmjs.org`; also pulls `@scarf/scarf` (telemetry, has install script) via `swagger-ui-dist`. Consider normalizing the lockfile to one registry.
2. `CHEATSHEET.md` is committed, but its own session log says it was verified as *untracked* — inconsistent intent.
3. The new `/docs` and `/openapi.json` routes have no test coverage (low risk, docs-only).

Known quirk found while running: invoking the skill through the Skill tool does not substitute `$1` into the inline `` !`gh pr diff $1` `` command (it ran `gh pr diff` bare). Typing `/review-pr 2` in the CLI substitutes correctly; the run above fetched the diff manually and followed the same instructions.

## 3. `/delivery` (chains ship → review-pr)

**Result: recorded in the follow-up section below** — this report file itself is the change that phase 1 ships.

---

## Hooks observed live during the runs

- **format.sh (PostToolUse)** — fired on every Edit/Write of TS/JS files; verified live: a deliberately misformatted file was rewritten by prettier immediately after `Write`.
- **guard-commit.sh (PreToolUse)** — runs `tsc --noEmit` before every `git commit`; green commits pass silently, a planted type error blocked the commit with the error text fed back for auto-fix.
