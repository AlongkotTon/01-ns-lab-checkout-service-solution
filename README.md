# checkout-service — ✅ SOLUTION BRANCH (สำหรับผู้สอน)

A small but realistic checkout/orders service. Used for **Lab B** (Dev + QA tracks).

Stack: Node.js · TypeScript · Express · Jest. Money is stored as **integer cents**.
Repositories are **async** (they await a tick) to make concurrency behaviour real.

## Getting started
```bash
npm install
npm run build     # compiles clean
npm test          # green on a fresh clone
npm run dev       # http://localhost:3000
```

## Auth
`/products` and `/orders` now require `Authorization: Bearer <token>` header. Obtain a token via `POST /auth/register` then `POST /auth/login` with `{ "username": ..., "password": ... }`. Both accept JSON bodies. `/health` and `/auth/*` routes are public.

## Layout
```
src/
├── lib/money.ts            integer-cents math      (tested)
├── lib/clock.ts            injectable clock (for coupon expiry)
├── lib/password.ts         scrypt hash/verify      (tested)
├── repositories/           async in-memory stores (product, order, user, session)
├── services/
│   ├── pricingService.ts   subtotal, tax, discount (tested)
│   ├── inventoryService.ts reserve/release stock   (NO tests — QA track)
│   ├── couponService.ts    coupon -> discount      (STUB — Dev track)
│   ├── authService.ts      register/login/token TTL (tested)
│   └── orderService.ts     checkout orchestration  (Dev extends)
├── routes/ · middleware/ · app.ts · index.ts
└── __tests__/              money, pricing, order, auth (green)
```

## Assignments
See **`docs/ASSIGNMENTS.md`**. Dev builds coupons + idempotency; QA proves and
fixes a concurrency bug in `inventoryService`.
