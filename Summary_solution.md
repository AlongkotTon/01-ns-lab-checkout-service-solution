# Summary — bug review & fixes

Review of the `checkout-service` lab-solution branch. The original code already had
all Lab B assignments implemented and **29/29 tests green**. This pass looked *past*
the passing suite for latent bugs, fixed them, and added tests.

## Baseline (before changes)
| Check | Result |
|---|---|
| `npm test` | 29/29 pass (6 suites) |
| `npm run typecheck` | clean |
| `npm run build` | clean |

No failing tests — every issue below was found by reading the code, not from a red test.

## After changes
| Check | Result |
|---|---|
| `npm test` | **35/35 pass (7 suites)** — +6 new tests |
| `npm run typecheck` | clean |
| `npm run build` | clean |

> Note: the IDE briefly flagged "Cannot find name 'describe/it/expect'" on test files.
> This is a stale TypeScript-language-server artifact (it hit pre-existing green test
> files too); `tsc --noEmit` and `tsc` both exit 0 with `@types/jest` installed.

---

## Fixes

### 1. Idempotency key reused with a different request (semantic bug)
**File:** `src/services/orderService.ts`
Previously, replaying an `Idempotency-Key` with a *different* cart/coupon silently
returned the original order and ignored the new request — masking a client bug.
Now each idempotency record stores a `fingerprint` (stable JSON of `lines` + `couponCode`).
A repeat with the same key but a different fingerprint throws `ConflictError` (HTTP 409).
Identical replays still return the original order untouched (unchanged behavior).

### 2. Unbounded memory growth in the per-key lock (leak)
**File:** `src/lib/locks.ts`
The `chains` map added one entry per lock key (every SKU, every idempotency key) and
**never removed them** — a slow leak in any long-running process. Now the tail promise
evicts its own entry once the per-key queue drains, *only* if no newer caller has
queued behind it (so serialization is preserved). Concurrency tests still pass.

### 3. Rollback didn't cover a *thrown* reservation
**File:** `src/services/orderService.ts`
The reserve loop released prior reservations only on a returned `false`, not on a
thrown error. It was unreachable today (SKUs are pre-validated in `computeSubtotal`),
but fragile. The loop is now wrapped in `try/catch`, so any mid-loop failure releases
everything already reserved before rethrowing.

### 4. All errors collapsed to HTTP 400
**Files:** `src/lib/errors.ts` (new), `src/middleware/errorHandler.ts`,
`src/services/pricingService.ts`, `src/services/inventoryService.ts`,
`src/services/orderService.ts`
Introduced `HttpError` with `NotFoundError` (404) and `ConflictError` (409). The error
handler now honors `err.status`, falling back to 400. Result:
- unknown SKU → **404**
- insufficient stock / idempotency-key reuse conflict → **409**
- validation (e.g. non-positive quantity) → **400** (unchanged)

### 5. `reserve`/`release` accepted non-positive quantity
**File:** `src/services/inventoryService.ts`
A negative quantity would *inflate* stock (`stock - (-n)`) and return `true`. HTTP
callers were shielded by `computeSubtotal`, but a direct call was not. Both functions
now reject `quantity <= 0`.

### Minor (noted, not changed)
`doCheckout` computes the subtotal twice (once directly, once inside `priceCart`) —
redundant work, not a bug. Left as-is to keep the change minimal.

---

## Tests added
- `src/__tests__/checkoutFeature.test.ts` — same idempotency key + different cart → rejected, no extra stock taken.
- `src/__tests__/inventory.test.ts` — non-positive `reserve` quantity is rejected and does not change stock.
- `src/__tests__/app.test.ts` (new) — end-to-end HTTP status codes via `supertest`: 201 success, 409 insufficient stock, 404 unknown SKU, 409 idempotency-key reuse.

## How to verify
```bash
npm install
npm test           # 35/35 pass
npm run typecheck  # clean
npm run build      # clean
```

## Caveat
This is the instructor **solution** branch (`SOLUTION.md`, `docs/ASSIGNMENTS.md`).
These fixes go beyond the graded Lab B criteria and change some observable behavior
(HTTP status codes, idempotency-mismatch rejection). If the branch must match the
original answer key exactly, revert or gate these before using it for grading.
