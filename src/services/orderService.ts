import { randomUUID } from 'crypto';
import { CartLine, Order } from '../types';
import { computeSubtotal, priceCart } from './pricingService';
import { discountForCoupon } from './couponService';
import * as inventory from './inventoryService';
import { orderRepo } from '../repositories/orderRepo';
import { couponRepo } from '../repositories/couponRepo';
import { createAsyncStore } from '../repositories/asyncStore';
import { withLock } from '../lib/locks';
import { ConflictError } from '../lib/errors';

export interface CheckoutInput {
  lines: CartLine[];
  couponCode?: string | null;
  idempotencyKey?: string;
}

interface IdempotencyRecord {
  key: string;
  fingerprint: string;
  orderId: string;
}

const idempotencyStore = createAsyncStore<IdempotencyRecord>((r) => r.key);

/** Stable signature of the request an idempotency key stands for. */
function fingerprint(input: CheckoutInput): string {
  return JSON.stringify({ lines: input.lines, couponCode: input.couponCode ?? null });
}

async function doCheckout(input: CheckoutInput): Promise<Order> {
  // 1) Resolve the coupon (unknown / missing code -> no discount).
  const coupon = input.couponCode ? (await couponRepo.get(input.couponCode)) ?? null : null;

  // 2) Price the cart with the coupon's discount.
  const subtotal = await computeSubtotal(input.lines);
  const discount = discountForCoupon(coupon, subtotal);
  const breakdown = await priceCart(input.lines, discount);

  // 3) Reserve stock, releasing anything already taken if a later line fails
  //    — whether that failure is a refused reservation or a thrown error.
  const reserved: CartLine[] = [];
  try {
    for (const line of input.lines) {
      const ok = await inventory.reserve(line.sku, line.quantity);
      if (!ok) throw new ConflictError(`insufficient stock for ${line.sku}`);
      reserved.push(line);
    }
  } catch (err) {
    for (const r of reserved) await inventory.release(r.sku, r.quantity);
    throw err;
  }

  // 4) Persist.
  const order: Order = {
    id: randomUUID(),
    lines: input.lines,
    breakdown,
    couponCode: coupon?.code ?? null,
    createdAt: new Date().toISOString(),
  };
  await orderRepo.put(order);
  return order;
}

/**
 * Check out a cart.
 *
 * Idempotency: when an Idempotency-Key is supplied, the whole operation is
 * serialized per key, and a key that already completed returns the ORIGINAL
 * order without touching stock again — safe retries, even concurrent ones.
 */
export async function checkout(input: CheckoutInput): Promise<Order> {
  if (!input.idempotencyKey) return doCheckout(input);

  const key = input.idempotencyKey;
  const fp = fingerprint(input);
  return withLock(`idem:${key}`, async () => {
    const existing = await idempotencyStore.get(key);
    if (existing) {
      // A key stands for one specific request; reusing it with a different
      // cart/coupon is a client bug, not a safe retry.
      if (existing.fingerprint !== fp) {
        throw new ConflictError(`idempotency key "${key}" was reused with a different request`);
      }
      const order = await orderRepo.get(existing.orderId);
      if (order) return order;
    }
    const order = await doCheckout(input);
    // Record the key only AFTER success, so a failed attempt can be retried.
    await idempotencyStore.put({ key, fingerprint: fp, orderId: order.id });
    return order;
  });
}
