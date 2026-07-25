import { register, login, verifyToken } from "../services/authService";
import { userRepo } from "../repositories/userRepo";
import { sessionRepo } from "../repositories/sessionRepo";
import { fixedClock } from "../lib/clock";

const T0 = "2026-01-01T00:00:00.000Z";

beforeEach(async () => {
  await userRepo.seed([]);
  await sessionRepo.seed([]);
});

describe("register", () => {
  it("stores the user and returns the username", async () => {
    expect(await register({ username: "alice", password: "pw1" })).toEqual({
      username: "alice",
    });
    const user = await userRepo.get("alice");
    expect(user).toBeDefined();
    expect(user!.passwordHash).not.toContain("pw1"); // hashed, not plain text
  });

  it("rejects a duplicate username", async () => {
    await register({ username: "alice", password: "pw1" });
    await expect(
      register({ username: "alice", password: "other" }),
    ).rejects.toThrow("username already taken");
  });

  it("rejects empty username or password", async () => {
    await expect(register({ username: "", password: "pw1" })).rejects.toThrow(
      "required",
    );
    await expect(register({ username: "alice", password: "" })).rejects.toThrow(
      "required",
    );
  });
});

describe("login", () => {
  beforeEach(() => register({ username: "alice", password: "pw1" }));

  it("returns a token expiring 1 hour from the clock", async () => {
    const result = await login(
      { username: "alice", password: "pw1" },
      fixedClock(T0),
    );
    expect(result).not.toBeNull();
    expect(result!.token).toMatch(/^[0-9a-f]{64}$/);
    expect(result!.expiresAt).toBe("2026-01-01T01:00:00.000Z");
  });

  it("returns null for a wrong password", async () => {
    expect(
      await login({ username: "alice", password: "nope" }, fixedClock(T0)),
    ).toBeNull();
  });

  it("returns null for an unknown username", async () => {
    expect(
      await login({ username: "bob", password: "pw1" }, fixedClock(T0)),
    ).toBeNull();
  });
});

describe("verifyToken", () => {
  let token: string;

  beforeEach(async () => {
    await register({ username: "alice", password: "pw1" });
    token = (await login(
      { username: "alice", password: "pw1" },
      fixedClock(T0),
    ))!.token;
  });

  it("returns the session for a valid, unexpired token", async () => {
    const session = await verifyToken(
      token,
      fixedClock("2026-01-01T00:59:00.000Z"),
    );
    expect(session).toMatchObject({ token, username: "alice" });
  });

  it("returns null for an unknown token", async () => {
    expect(await verifyToken("deadbeef", fixedClock(T0))).toBeNull();
  });

  it("returns null after expiry", async () => {
    expect(
      await verifyToken(token, fixedClock("2026-01-01T01:01:00.000Z")),
    ).toBeNull();
  });

  it("returns null at exactly expiresAt (strict comparison)", async () => {
    expect(
      await verifyToken(token, fixedClock("2026-01-01T01:00:00.000Z")),
    ).toBeNull();
  });
});
