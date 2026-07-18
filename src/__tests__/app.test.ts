import request from 'supertest';
import { createApp } from '../app';

// Uses the seed data from createApp: MUG has stock 4.
async function app() {
  return createApp();
}

describe('POST /orders/checkout — HTTP status codes', () => {
  it('201 on success', async () => {
    const res = await request(await app())
      .post('/orders/checkout')
      .send({ lines: [{ sku: 'PEN', quantity: 1 }] });
    expect(res.status).toBe(201);
    expect(res.body.breakdown.subtotalCents).toBe(250);
  });

  it('409 when stock is insufficient', async () => {
    const res = await request(await app())
      .post('/orders/checkout')
      .send({ lines: [{ sku: 'MUG', quantity: 99 }] });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/insufficient/);
  });

  it('404 for an unknown sku', async () => {
    const res = await request(await app())
      .post('/orders/checkout')
      .send({ lines: [{ sku: 'NOPE', quantity: 1 }] });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/unknown sku/);
  });

  it('409 when an idempotency key is reused with a different cart', async () => {
    const server = await app();
    await request(server)
      .post('/orders/checkout')
      .set('Idempotency-Key', 'http-k1')
      .send({ lines: [{ sku: 'PEN', quantity: 1 }] });
    const res = await request(server)
      .post('/orders/checkout')
      .set('Idempotency-Key', 'http-k1')
      .send({ lines: [{ sku: 'PEN', quantity: 2 }] });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/different request/);
  });
});
