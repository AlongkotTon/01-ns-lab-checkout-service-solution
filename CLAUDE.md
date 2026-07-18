# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small checkout/orders service used as a **teaching lab** ("Lab B") for a Claude Code bootcamp. This is the **solution branch** — every assignment is implemented and all tests pass. `docs/ASSIGNMENTS.md` (Thai) states the exercises; `SOLUTION.md` (Thai) is the instructor answer key explaining what was changed and why. Consult both before altering behavior, so a change doesn't silently undo the pedagogical point of an assignment.

Stack: Node.js · TypeScript (strict) · Express · Jest (ts-jest).

## Commands

```bash
npm run build      # tsc -> dist/
npm run typecheck  # tsc --noEmit (no output)
npm test           # jest, all suites
npm run dev        # tsx watch, serves http://localhost:3000
npm start          # run compiled dist/index.js

npx jest src/__tests__/inventory.test.ts   # single test file
npx jest -t "CONCURRENCY"                   # single test by name
```

## Architecture

Request flow: `routes/` (parse HTTP) → `services/` (business logic) → `repositories/` (storage). `app.ts` builds the Express app and seeds demo products + coupons; `index.ts` starts the listener. Errors thrown anywhere are caught by `middleware/errorHandler.ts` and returned as `400 { error: message }`.

Two invariants shape everything:

- **Money is integer cents** (`Cents`), never floats. All arithmetic goes through `lib/money.ts` (`percentOf`, `taxOf`, etc.) with half-up rounding. Never introduce floating-point currency math.
- **Repositories are deliberately async.** `repositories/asyncStore.ts` is an in-memory `Map` where *every* operation `await`s a `setTimeout(0)` tick. This is intentional: it forces real interleaving so concurrency bugs in callers become observable. Do not "optimize" the tick away.

### Concurrency model (the core of the lab)

Because read-check-write across an `await` can interleave, correctness depends on `lib/locks.ts` — a per-key async mutex (`withLock(key, fn)`) that serializes calls sharing a key while letting different keys run in parallel. Two places rely on it:

- `inventoryService.reserve/release` wrap the stock read-check-write in `withLock('sku:'+sku)` → prevents overselling the last unit under concurrent reservations.
- `orderService.checkout` wraps the whole idempotent operation in `withLock('idem:'+key)` → serializes retries sharing an `Idempotency-Key`.

### Checkout orchestration (`services/orderService.ts`)

`checkout()` composes pricing, coupons, and inventory. Two subtleties that are correctness requirements, not style:

- **Stock rollback:** lines are reserved one at a time; if a later line fails, all already-reserved lines are `release`d before throwing.
- **Idempotency ordering:** the key→orderId mapping is recorded *only after* a checkout fully succeeds. Recording before reserving stock would make a failed attempt un-retryable. A repeated key returns the original order without touching stock.

### Repositories are module-level singletons

`productRepo`, `couponRepo`, and the idempotency store are shared, mutable, in-memory singletons. Tests reset state with `productRepo.seed([...])` in `beforeEach`; seeding replaces all contents. State does not reset between requests at runtime (it's a demo store).

## Testing conventions

- Tests live in `src/__tests__/*.test.ts`.
- Reset shared repo state via `seed()` in `beforeEach`.
- Concurrency is tested by firing overlapping ops with `Promise.all` and asserting no oversell / correct success count (see `inventory.test.ts`).
- For time-dependent logic (coupon expiry), inject a `Clock` — use `fixedClock(iso)` from `lib/clock.ts` instead of the real system time.
