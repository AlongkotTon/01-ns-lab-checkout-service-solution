import { Router, Request, Response, NextFunction } from 'express';
import { checkout } from '../services/orderService';
import { CartLine } from '../types';

export const orderRouter = Router();

// Validate untrusted request input before it reaches pricing/inventory.
// Without this, a body like {"lines":[{"sku":"BOOK"}]} slips a NaN quantity
// through the `<= 0` check and permanently corrupts stock accounting.
function parseLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('lines must be a non-empty array');
  }
  return raw.map((item) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('each line must be an object with sku and quantity');
    }
    const { sku, quantity } = item as Record<string, unknown>;
    if (typeof sku !== 'string' || sku.length === 0) {
      throw new Error('line.sku must be a non-empty string');
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`line.quantity must be a positive integer for ${sku}`);
    }
    return { sku, quantity };
  });
}

// POST /orders/checkout
// Dev track: read `couponCode` from the body and `Idempotency-Key` from headers.
orderRouter.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lines = parseLines(req.body?.lines);
    const order = await checkout({
      lines,
      couponCode: req.body?.couponCode ?? null,
      idempotencyKey: req.header('Idempotency-Key') ?? undefined,
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});
