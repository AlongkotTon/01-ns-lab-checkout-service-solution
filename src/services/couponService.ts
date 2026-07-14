import { Coupon } from '../types';
import { Clock, systemClock } from '../lib/clock';
import { percentOf } from '../lib/money';

/**
 * Coupon -> discount (cents).
 *   - null coupon                        -> 0
 *   - expired (expiresAt <= now)         -> 0
 *   - subtotal < coupon.minSubtotalCents -> 0
 *   - 'percent' -> percentOf(subtotal, value) (rounded half-up)
 *   - 'fixed'   -> value (cents)
 *   - never exceeds the subtotal, never negative
 */
export function discountForCoupon(
  coupon: Coupon | null,
  subtotalCents: number,
  clock: Clock = systemClock,
): number {
  if (!coupon) return 0;
  if (new Date(coupon.expiresAt).getTime() <= clock.now().getTime()) return 0;
  if (subtotalCents < coupon.minSubtotalCents) return 0;

  const raw = coupon.type === 'percent' ? percentOf(subtotalCents, coupon.value) : coupon.value;
  return Math.max(0, Math.min(raw, subtotalCents));
}
