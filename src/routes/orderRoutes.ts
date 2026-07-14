import { Router, Request, Response, NextFunction } from 'express';
import { checkout } from '../services/orderService';
import { CartLine } from '../types';

export const orderRouter = Router();

// POST /orders/checkout
// Dev track: read `couponCode` from the body and `Idempotency-Key` from headers.
orderRouter.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lines = (req.body?.lines ?? []) as CartLine[];
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
