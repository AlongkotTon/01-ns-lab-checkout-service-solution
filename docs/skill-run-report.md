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

**Result: ✅ full chain completed** — this report file itself was the change that phase 1 shipped.

**Phase 1 (ship):** diff = `docs/skill-run-report.md` (this file) · review clean · `npm test` **29/29 pass** · committed `3ca5eed` and pushed. The branch already had an open PR, so the existing fork PR [#1](https://github.com/AlongkotTon/01-ns-lab-checkout-service-solution/pull/1) was reused instead of `gh pr create` (which would fail with "PR already exists") → PR number carried to phase 2 = **1**.

**Phase 2 (review-pr 1):** live diff fetched via `gh pr diff 1` — 10 files, all Lab A team tooling (3 skills, 2 hooks, settings.json, checklist, this report, prettier devDependency).

| Item | Verdict | Evidence |
|---|---|---|
| C1 money integer cents | — n/a | No runtime/money code touched |
| C2 edge cases tested | ✅ pass* | Hooks verified by stdin pipe-tests (3 guard cases + format fix) and one live in-session firing each; *no automated tests — see note |
| C3 error handling | ✅ pass | `guard-commit.sh` fails loud: exit 2 + reason on stderr; `format.sh` never blocks (`|| true`) |
| C4 no secrets | ✅ pass | Hooks/settings contain no credentials; `.env` reads remain denied in `settings.local.json` |
| C5 input validated | ✅ pass | Hooks bail on empty `file_path` / non-`git commit` commands before doing work |
| C6 conventions | ✅ pass | Skills follow `.claude/skills/<name>/SKILL.md`; checklist under `docs/` |
| C7 no `any`/`console.log` | — n/a | No TS changes |
| C8 commit messages | ✅ pass | 5 descriptive commits (what + why) |

**Verdict: APPROVE** — note: hook behavior is only covered by manual pipe-tests documented here; if the team wants regression coverage, wrap them in a small bats/jest shell test.

**Final summary:** PR https://github.com/AlongkotTon/01-ns-lab-checkout-service-solution/pull/1 · tests 29/29 green · review APPROVE · nothing blocking merge.

---

## Hooks observed live during the runs

- **format.sh (PostToolUse)** — fired on every Edit/Write of TS/JS files; verified live: a deliberately misformatted file was rewritten by prettier immediately after `Write`.
- **guard-commit.sh (PreToolUse)** — runs `tsc --noEmit` before every `git commit`; green commits pass silently, a planted type error blocked the commit with the error text fed back for auto-fix.
