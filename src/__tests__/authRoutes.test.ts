import request from "supertest";
import { Express } from "express";
import { createApp } from "../app";
import { userRepo } from "../repositories/userRepo";
import { sessionRepo } from "../repositories/sessionRepo";

let app: Express;

beforeEach(async () => {
  await userRepo.seed([]);
  await sessionRepo.seed([]);
  app = await createApp();
});

describe("POST /auth/register", () => {
  it("creates a user and returns 201", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "alice", password: "pw1" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ username: "alice" });
  });

  it("returns 400 for a duplicate username", async () => {
    await request(app)
      .post("/auth/register")
      .send({ username: "alice", password: "pw1" });
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "alice", password: "pw2" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username already taken");
  });

  it("returns 400 when a field is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "alice" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/auth/register")
      .send({ username: "alice", password: "pw1" });
  });

  it("returns a token on success", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "pw1" });
    expect(res.status).toBe(200);
    expect(res.body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof res.body.expiresAt).toBe("string");
  });

  it("returns the same 401 for wrong password and unknown user", async () => {
    const wrongPw = await request(app)
      .post("/auth/login")
      .send({ username: "alice", password: "nope" });
    const unknown = await request(app)
      .post("/auth/login")
      .send({ username: "bob", password: "pw1" });
    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body).toEqual(unknown.body);
    expect(wrongPw.body.error).toBe("invalid username or password");
  });
});
