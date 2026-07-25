# Design: Token Auth for checkout-service

**Date:** 2026-07-25
**Status:** Approved (pending spec review)

## Goal

Add username/password authentication to the checkout-service lab. Users register
and log in via new `/auth` endpoints; login issues an opaque bearer token with a
1-hour TTL; all routes except `/health` and `/auth` require a valid token.

Zero new dependencies (runtime or dev): hashing uses `node:crypto`, tokens use
`crypto.randomBytes`, and the integration test uses `supertest`, which is
already a devDependency.

## Architecture

Five new files following the existing repo → service → route layering, plus
small edits to `app.ts` and `types.ts`:

```
src/lib/password.ts              scrypt hash + verify (node:crypto)
src/repositories/userRepo.ts     users keyed by username (createAsyncStore)
src/repositories/sessionRepo.ts  sessions keyed by token (createAsyncStore)
src/services/authService.ts      register, login, verifyToken
src/middleware/requireAuth.ts    Bearer-token guard
src/routes/authRoutes.ts         POST /auth/register, POST /auth/login
```

## Data model

Added to `src/types.ts`:

```ts
interface User {
  username: string;
  passwordHash: string; // "salt:hash", both hex, produced by lib/password.ts
}

interface Session {
  token: string;
  username: string;
  expiresAt: string; // ISO 8601, same convention as Coupon.expiresAt
}
```

Both repositories are built on `createAsyncStore` like the existing repos:
`userRepo` keyed by `username`, `sessionRepo` keyed by `token`. No seeded
users — accounts come only from `/auth/register`.

## Components

### `src/lib/password.ts`

- `hashPassword(password: string): Promise<string>` — generates a 16-byte random
  salt, derives a 64-byte scrypt key, returns `"<salt hex>:<hash hex>"`.
- `verifyPassword(password: string, stored: string): Promise<boolean>` — splits
  the stored string, re-derives with the same salt, compares with
  `crypto.timingSafeEqual`.

### `src/services/authService.ts`

Follows the couponService pattern: functions take an injectable `Clock`
defaulting to `systemClock` so expiry is testable with `fixedClock`.

- `register({ username, password })` — throws on missing/empty username or
  password and on duplicate username; stores the user with a hashed password;
  returns `{ username }`.
- `login({ username, password }, clock?)` — returns `null` when the username is
  unknown **or** the password is wrong (callers must not be able to distinguish
  the two). On success: creates a token via
  `crypto.randomBytes(32).toString('hex')`, stores a `Session` with
  `expiresAt = clock.now() + 1 hour`, returns `{ token, expiresAt }`.
- `verifyToken(token, clock?)` — returns the `Session` when the token exists and
  `clock.now()` is strictly before `expiresAt`; otherwise `null`. Expired
  sessions are not deleted (keeps the store simple; a restart clears them).

The 1-hour TTL is a named constant in `authService.ts`.

### `src/middleware/requireAuth.ts`

Reads the `Authorization` header, expects `Bearer <token>`. Missing header,
malformed header, or a token that `verifyToken` rejects → responds
`401 { error: "unauthorized" }` directly (does **not** throw, see Error
handling). On success calls `next()`.

### `src/routes/authRoutes.ts`

- `POST /auth/register` — body `{ username, password }` → `201 { username }`.
  Validation and duplicate errors are thrown and reach `errorHandler` (400).
- `POST /auth/login` — body `{ username, password }`. When `login` returns
  `null` → responds `401 { error: "invalid username or password" }` directly.
  Success → `200 { token, expiresAt }`.

### `app.ts` wiring

```ts
app.get('/health', ...);                            // public
app.use('/auth', authRouter);                       // public
app.use('/products', requireAuth, productRouter);   // protected
app.use('/orders', requireAuth, orderRouter);       // protected
```

## Error handling

The existing `errorHandler` maps every thrown error to 400, which is right for
validation but wrong for auth. Rather than change it, auth failures respond
directly:

| Case | Status | Source |
|---|---|---|
| Register: missing/empty field, duplicate username | 400 | thrown → `errorHandler` |
| Login: unknown user or wrong password | 401 | login route responds directly |
| Protected route: missing/malformed/unknown/expired token | 401 | `requireAuth` responds directly |

## Testing

### Unit — `src/__tests__/authService.test.ts`

- `password.ts`: hash → verify round-trip succeeds; wrong password fails; two
  hashes of the same password differ (salting).
- `register`: happy path; duplicate username throws; empty username/password
  throws.
- `login`: success returns token + expiresAt one hour from the injected clock;
  wrong password and unknown user both return `null`.
- `verifyToken`: valid token returns the session; garbage token returns `null`;
  token expired via `fixedClock` (login at T, verify at T+61min) returns `null`;
  verify at exactly `expiresAt` returns `null` (strict comparison).

Repos are reset with `seed([])` in `beforeEach`, matching existing tests.

### Integration — `src/__tests__/authFeature.test.ts`

Builds the real app with `createApp()` and calls it with `supertest` (already
a devDependency):

- `GET /health` without a token → 200.
- `GET /products` without a token → 401.
- Full flow: register → login → `GET /products` and `POST /orders/checkout`
  with `Authorization: Bearer <token>` → 200 / 201.
- Register with a duplicate username → 400; login with a wrong password → 401.

## Out of scope

- Logout / token revocation endpoint
- Per-user order ownership (orders are not associated with the logged-in user)
- Rate limiting, account lockout, password strength rules
- Persistent storage (in-memory only, like the rest of the lab)
