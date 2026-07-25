# Token Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add register/login endpoints that issue 1-hour opaque bearer tokens, and require a valid token on every route except `/health` and `/auth`.

**Architecture:** Follows the existing repo → service → route layering. `lib/password.ts` does scrypt hashing; `userRepo`/`sessionRepo` are `createAsyncStore` one-liners; `authService` holds register/login/verifyToken with an injectable `Clock`; `requireAuth` middleware guards `/products` and `/orders`; `authRoutes` exposes `/auth/register` and `/auth/login`.

**Tech Stack:** Node.js · TypeScript · Express 4 · Jest (ts-jest) · supertest (already installed). Spec: `docs/superpowers/specs/2026-07-25-basic-auth-design.md`.

## Global Constraints

- Zero new dependencies, runtime or dev. Hashing and tokens use `node:crypto`; the integration test uses `supertest`, which is already a devDependency.
- Token TTL is exactly 1 hour, defined as the named constant `TOKEN_TTL_MS` in `authService.ts`.
- Auth failure responses are sent directly (never thrown): middleware sends `401 { "error": "unauthorized" }`; login sends `401 { "error": "invalid username or password" }`. Wrong username and wrong password must be indistinguishable to the caller.
- Validation errors (missing fields, duplicate username) are thrown so the existing `errorHandler` turns them into 400.
- Token expiry is strict: a token is invalid at exactly `expiresAt` (`now >= expiresAt` → invalid).
- `expiresAt` is an ISO 8601 string, matching `Coupon.expiresAt`.
- No seeded users; accounts come only from `POST /auth/register`.
- Run tests with `npm test -- src/__tests__/<file>.test.ts`; run `npm run typecheck` before each commit.

---

### Task 1: Password hashing (`lib/password.ts`)

**Files:**
- Create: `src/lib/password.ts`
- Test: `src/__tests__/password.test.ts`

**Interfaces:**
- Consumes: nothing (only `node:crypto`)
- Produces: `hashPassword(password: string): Promise<string>` returning `"<salt hex>:<hash hex>"`, and `verifyPassword(password: string, stored: string): Promise<boolean>`. Task 2's `authService` calls both.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/password.test.ts`:

```ts
import { hashPassword, verifyPassword } from '../lib/password';

describe('password hashing', () => {
  it('verifies a correct password against its hash', async () => {
    const stored = await hashPassword('s3cret');
    expect(await verifyPassword('s3cret', stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('s3cret');
    expect(await verifyPassword('wrong', stored)).toBe(false);
  });

  it('salts: hashing the same password twice gives different strings', async () => {
    expect(await hashPassword('s3cret')).not.toBe(await hashPassword('s3cret'));
  });

  it('stores as "<salt>:<hash>" hex pair', async () => {
    const stored = await hashPassword('s3cret');
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it('rejects a malformed stored string instead of throwing', async () => {
    expect(await verifyPassword('s3cret', 'not-a-valid-hash')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/password.test.ts`
Expected: FAIL — cannot find module `../lib/password`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/password.ts`:

```ts
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Hash a password as "<salt hex>:<hash hex>" with a fresh random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const key = await deriveKey(password, salt);
  return `${salt}:${key.toString('hex')}`;
}

/** Constant-time check of a password against a stored "<salt>:<hash>" string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const key = await deriveKey(password, salt);
  const expected = Buffer.from(hashHex, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/password.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/password.ts src/__tests__/password.test.ts
git commit -m "feat: add scrypt password hashing in lib/password"
```

---

### Task 2: Types, repositories, and authService

**Files:**
- Modify: `src/types.ts` (append `User` and `Session`)
- Create: `src/repositories/userRepo.ts`
- Create: `src/repositories/sessionRepo.ts`
- Create: `src/services/authService.ts`
- Test: `src/__tests__/authService.test.ts`

**Interfaces:**
- Consumes: `hashPassword`/`verifyPassword` from Task 1; `createAsyncStore` from `src/repositories/asyncStore.ts`; `Clock`, `systemClock`, `fixedClock` from `src/lib/clock.ts`.
- Produces (used by Tasks 3 and 4):
  - `register(creds: { username: string; password: string }): Promise<{ username: string }>` — throws `Error('username and password are required')` or `Error('username already taken')`.
  - `login(creds: { username: string; password: string }, clock?: Clock): Promise<{ token: string; expiresAt: string } | null>`
  - `verifyToken(token: string, clock?: Clock): Promise<Session | null>`
  - `TOKEN_TTL_MS` constant; `userRepo`, `sessionRepo` stores; `User`, `Session` types.

- [ ] **Step 1: Add the types**

Append to `src/types.ts`:

```ts
export interface User {
  username: string;
  passwordHash: string; // "salt:hash" produced by lib/password.ts
}

export interface Session {
  token: string;
  username: string;
  expiresAt: string; // ISO timestamp, same convention as Coupon.expiresAt
}
```

- [ ] **Step 2: Add the repositories**

Create `src/repositories/userRepo.ts`:

```ts
import { User } from '../types';
import { createAsyncStore } from './asyncStore';

export const userRepo = createAsyncStore<User>((u) => u.username);
```

Create `src/repositories/sessionRepo.ts`:

```ts
import { Session } from '../types';
import { createAsyncStore } from './asyncStore';

export const sessionRepo = createAsyncStore<Session>((s) => s.token);
```

- [ ] **Step 3: Write the failing test**

Create `src/__tests__/authService.test.ts`:

```ts
import { register, login, verifyToken } from '../services/authService';
import { userRepo } from '../repositories/userRepo';
import { sessionRepo } from '../repositories/sessionRepo';
import { fixedClock } from '../lib/clock';

const T0 = '2026-01-01T00:00:00.000Z';

beforeEach(async () => {
  await userRepo.seed([]);
  await sessionRepo.seed([]);
});

describe('register', () => {
  it('stores the user and returns the username', async () => {
    expect(await register({ username: 'alice', password: 'pw1' })).toEqual({ username: 'alice' });
    const user = await userRepo.get('alice');
    expect(user).toBeDefined();
    expect(user!.passwordHash).not.toContain('pw1'); // hashed, not plain text
  });

  it('rejects a duplicate username', async () => {
    await register({ username: 'alice', password: 'pw1' });
    await expect(register({ username: 'alice', password: 'other' })).rejects.toThrow('username already taken');
  });

  it('rejects empty username or password', async () => {
    await expect(register({ username: '', password: 'pw1' })).rejects.toThrow('required');
    await expect(register({ username: 'alice', password: '' })).rejects.toThrow('required');
  });
});

describe('login', () => {
  beforeEach(() => register({ username: 'alice', password: 'pw1' }));

  it('returns a token expiring 1 hour from the clock', async () => {
    const result = await login({ username: 'alice', password: 'pw1' }, fixedClock(T0));
    expect(result).not.toBeNull();
    expect(result!.token).toMatch(/^[0-9a-f]{64}$/);
    expect(result!.expiresAt).toBe('2026-01-01T01:00:00.000Z');
  });

  it('returns null for a wrong password', async () => {
    expect(await login({ username: 'alice', password: 'nope' }, fixedClock(T0))).toBeNull();
  });

  it('returns null for an unknown username', async () => {
    expect(await login({ username: 'bob', password: 'pw1' }, fixedClock(T0))).toBeNull();
  });
});

describe('verifyToken', () => {
  let token: string;

  beforeEach(async () => {
    await register({ username: 'alice', password: 'pw1' });
    token = (await login({ username: 'alice', password: 'pw1' }, fixedClock(T0)))!.token;
  });

  it('returns the session for a valid, unexpired token', async () => {
    const session = await verifyToken(token, fixedClock('2026-01-01T00:59:00.000Z'));
    expect(session).toMatchObject({ token, username: 'alice' });
  });

  it('returns null for an unknown token', async () => {
    expect(await verifyToken('deadbeef', fixedClock(T0))).toBeNull();
  });

  it('returns null after expiry', async () => {
    expect(await verifyToken(token, fixedClock('2026-01-01T01:01:00.000Z'))).toBeNull();
  });

  it('returns null at exactly expiresAt (strict comparison)', async () => {
    expect(await verifyToken(token, fixedClock('2026-01-01T01:00:00.000Z'))).toBeNull();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- src/__tests__/authService.test.ts`
Expected: FAIL — cannot find module `../services/authService`.

- [ ] **Step 5: Write the implementation**

Create `src/services/authService.ts`:

```ts
import { randomBytes } from 'crypto';
import { Session } from '../types';
import { Clock, systemClock } from '../lib/clock';
import { hashPassword, verifyPassword } from '../lib/password';
import { userRepo } from '../repositories/userRepo';
import { sessionRepo } from '../repositories/sessionRepo';

export const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface Credentials {
  username: string;
  password: string;
}

export async function register({ username, password }: Credentials): Promise<{ username: string }> {
  if (!username || !password) throw new Error('username and password are required');
  if (await userRepo.get(username)) throw new Error('username already taken');
  await userRepo.put({ username, passwordHash: await hashPassword(password) });
  return { username };
}

/**
 * Returns null for unknown username OR wrong password — callers must not be
 * able to tell which, so the 401 message never leaks whether a user exists.
 */
export async function login(
  { username, password }: Credentials,
  clock: Clock = systemClock,
): Promise<{ token: string; expiresAt: string } | null> {
  const user = await userRepo.get(username);
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(clock.now().getTime() + TOKEN_TTL_MS).toISOString();
  await sessionRepo.put({ token, username, expiresAt });
  return { token, expiresAt };
}

/** Valid strictly before expiresAt; expired sessions are left in the store. */
export async function verifyToken(token: string, clock: Clock = systemClock): Promise<Session | null> {
  const session = await sessionRepo.get(token);
  if (!session) return null;
  if (clock.now().getTime() >= new Date(session.expiresAt).getTime()) return null;
  return session;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- src/__tests__/authService.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
git add src/types.ts src/repositories/userRepo.ts src/repositories/sessionRepo.ts src/services/authService.ts src/__tests__/authService.test.ts
git commit -m "feat: add authService with register, login, and token verification"
```

---

### Task 3: Auth routes (`POST /auth/register`, `POST /auth/login`)

**Files:**
- Create: `src/routes/authRoutes.ts`
- Modify: `src/app.ts` (mount `/auth`)
- Test: `src/__tests__/authRoutes.test.ts`

**Interfaces:**
- Consumes: `register`, `login` from Task 2's `authService`.
- Produces: `authRouter` (Express `Router`) mounted at `/auth` in `app.ts`. Task 4's integration test registers and logs in through these endpoints.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/authRoutes.test.ts`:

```ts
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../app';
import { userRepo } from '../repositories/userRepo';
import { sessionRepo } from '../repositories/sessionRepo';

let app: Express;

beforeEach(async () => {
  await userRepo.seed([]);
  await sessionRepo.seed([]);
  app = await createApp();
});

describe('POST /auth/register', () => {
  it('creates a user and returns 201', async () => {
    const res = await request(app).post('/auth/register').send({ username: 'alice', password: 'pw1' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ username: 'alice' });
  });

  it('returns 400 for a duplicate username', async () => {
    await request(app).post('/auth/register').send({ username: 'alice', password: 'pw1' });
    const res = await request(app).post('/auth/register').send({ username: 'alice', password: 'pw2' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('username already taken');
  });

  it('returns 400 when a field is missing', async () => {
    const res = await request(app).post('/auth/register').send({ username: 'alice' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send({ username: 'alice', password: 'pw1' });
  });

  it('returns a token on success', async () => {
    const res = await request(app).post('/auth/login').send({ username: 'alice', password: 'pw1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof res.body.expiresAt).toBe('string');
  });

  it('returns the same 401 for wrong password and unknown user', async () => {
    const wrongPw = await request(app).post('/auth/login').send({ username: 'alice', password: 'nope' });
    const unknown = await request(app).post('/auth/login').send({ username: 'bob', password: 'pw1' });
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body).toEqual(unknown.body);
    expect(wrongPw.body.error).toBe('invalid username or password');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/authRoutes.test.ts`
Expected: FAIL — cannot find module `../routes/authRoutes` is not the error here; the app builds but `/auth/*` returns 404, so status assertions fail.

- [ ] **Step 3: Write the implementation**

Create `src/routes/authRoutes.ts`:

```ts
import { Router, Request, Response, NextFunction } from 'express';
import { register, login } from '../services/authService';

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await register({
      username: req.body?.username ?? '',
      password: req.body?.password ?? '',
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await login({
      username: req.body?.username ?? '',
      password: req.body?.password ?? '',
    });
    if (!result) {
      res.status(401).json({ error: 'invalid username or password' });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```

In `src/app.ts`, add the import and mount `/auth` between `/health` and `/products`:

```ts
import { authRouter } from './routes/authRoutes';
```

```ts
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/auth', authRouter);
  app.use('/products', productRouter);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/authRoutes.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/routes/authRoutes.ts src/__tests__/authRoutes.test.ts src/app.ts
git commit -m "feat: add /auth/register and /auth/login endpoints"
```

---

### Task 4: `requireAuth` middleware and route protection

**Files:**
- Create: `src/middleware/requireAuth.ts`
- Modify: `src/app.ts` (guard `/products` and `/orders`)
- Test: `src/__tests__/authFeature.test.ts`

**Interfaces:**
- Consumes: `verifyToken` from Task 2; `/auth` endpoints from Task 3.
- Produces: `requireAuth` (Express middleware). Final route table: `/health` and `/auth/*` public; `/products/*` and `/orders/*` require `Authorization: Bearer <token>`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/authFeature.test.ts`:

```ts
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../app';
import { userRepo } from '../repositories/userRepo';
import { sessionRepo } from '../repositories/sessionRepo';
import { orderRepo } from '../repositories/orderRepo';

let app: Express;

beforeEach(async () => {
  await userRepo.seed([]);
  await sessionRepo.seed([]);
  await orderRepo.seed([]);
  app = await createApp();
});

async function obtainToken(): Promise<string> {
  await request(app).post('/auth/register').send({ username: 'alice', password: 'pw1' });
  const res = await request(app).post('/auth/login').send({ username: 'alice', password: 'pw1' });
  return res.body.token;
}

describe('route protection', () => {
  it('keeps /health public', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('rejects /products without a token', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'unauthorized' });
  });

  it('rejects /orders/checkout without a token', async () => {
    expect((await request(app).post('/orders/checkout').send({ lines: [] })).status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/products').set('Authorization', 'NotBearer abc');
    expect(res.status).toBe(401);
  });

  it('rejects an unknown token', async () => {
    const res = await request(app).get('/products').set('Authorization', 'Bearer deadbeef');
    expect(res.status).toBe(401);
  });
});

describe('authenticated flow', () => {
  it('register -> login -> browse products -> checkout', async () => {
    const token = await obtainToken();

    const products = await request(app).get('/products').set('Authorization', `Bearer ${token}`);
    expect(products.status).toBe(200);
    expect(products.body.products.length).toBeGreaterThan(0);

    const checkout = await request(app)
      .post('/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ lines: [{ sku: 'BOOK', quantity: 1 }] });
    expect(checkout.status).toBe(201);
    expect(checkout.body.breakdown.subtotalCents).toBe(1500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/authFeature.test.ts`
Expected: FAIL — the "rejects" tests get 200/201/404 instead of 401 because nothing is protected yet (the authenticated-flow test passes).

- [ ] **Step 3: Write the implementation**

Create `src/middleware/requireAuth.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';

/** Responds 401 directly (never throws) so errorHandler's blanket 400 doesn't apply. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const [scheme, token] = (req.header('Authorization') ?? '').split(' ');
  const session = scheme === 'Bearer' && token ? await verifyToken(token) : null;
  if (!session) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}
```

In `src/app.ts`, add the import and guard the two routers:

```ts
import { requireAuth } from './middleware/requireAuth';
```

```ts
  app.use('/products', requireAuth, productRouter);
  app.use('/orders', requireAuth, orderRouter);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/authFeature.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites PASS. The pre-existing tests call services directly (not HTTP), so adding `requireAuth` must not break them; if any fail, stop and investigate before committing.

- [ ] **Step 6: Typecheck, build, and commit**

```bash
npm run typecheck
npm run build
git add src/middleware/requireAuth.ts src/__tests__/authFeature.test.ts src/app.ts
git commit -m "feat: require bearer token on /products and /orders"
```
