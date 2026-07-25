import request from "supertest";
import { Express } from "express";
import { createApp } from "../app";
import { userRepo } from "../repositories/userRepo";
import { sessionRepo } from "../repositories/sessionRepo";
import { orderRepo } from "../repositories/orderRepo";

let app: Express;

beforeEach(async () => {
  await userRepo.seed([]);
  await sessionRepo.seed([]);
  await orderRepo.seed([]);
  app = await createApp();
});

async function obtainToken(): Promise<string> {
  await request(app)
    .post("/auth/register")
    .send({ username: "alice", password: "pw1" });
  const res = await request(app)
    .post("/auth/login")
    .send({ username: "alice", password: "pw1" });
  return res.body.token;
}

describe("route protection", () => {
  it("keeps /health public", async () => {
    expect((await request(app).get("/health")).status).toBe(200);
  });

  it("rejects /products without a token", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "unauthorized" });
  });

  it("rejects /orders/checkout without a token", async () => {
    expect(
      (await request(app).post("/orders/checkout").send({ lines: [] })).status,
    ).toBe(401);
  });

  it("rejects a malformed Authorization header", async () => {
    const res = await request(app)
      .get("/products")
      .set("Authorization", "NotBearer abc");
    expect(res.status).toBe(401);
  });

  it("rejects an unknown token", async () => {
    const res = await request(app)
      .get("/products")
      .set("Authorization", "Bearer deadbeef");
    expect(res.status).toBe(401);
  });
});

describe("authenticated flow", () => {
  it("register -> login -> browse products -> checkout", async () => {
    const token = await obtainToken();

    const products = await request(app)
      .get("/products")
      .set("Authorization", `Bearer ${token}`);
    expect(products.status).toBe(200);
    expect(products.body.products.length).toBeGreaterThan(0);

    const checkout = await request(app)
      .post("/orders/checkout")
      .set("Authorization", `Bearer ${token}`)
      .send({ lines: [{ sku: "BOOK", quantity: 1 }] });
    expect(checkout.status).toBe(201);
    expect(checkout.body.breakdown.subtotalCents).toBe(1500);
  });
});
