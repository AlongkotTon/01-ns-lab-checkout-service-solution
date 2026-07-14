import { discountForCoupon } from '../services/couponService';
import { fixedClock } from '../lib/clock';
import { Coupon } from '../types';

const NOW = fixedClock('2026-01-01T00:00:00.000Z');
const base = { minSubtotalCents: 0, expiresAt: '2027-01-01T00:00:00.000Z' };

describe('discountForCoupon', () => {
  it('returns 0 for a null coupon', () => {
    expect(discountForCoupon(null, 5000, NOW)).toBe(0);
  });

  it('returns 0 for an expired coupon (boundary: expiresAt == now)', () => {
    const c: Coupon = { code: 'X', type: 'percent', value: 50, ...base, expiresAt: '2026-01-01T00:00:00.000Z' };
    expect(discountForCoupon(c, 5000, NOW)).toBe(0);
  });

  it('returns 0 below the minimum subtotal', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 300, ...base, minSubtotalCents: 2000 };
    expect(discountForCoupon(c, 1999, NOW)).toBe(0);
    expect(discountForCoupon(c, 2000, NOW)).toBe(300); // boundary: exactly min qualifies
  });

  it('percent coupons round half-up', () => {
    const c: Coupon = { code: 'X', type: 'percent', value: 10, ...base };
    expect(discountForCoupon(c, 255, NOW)).toBe(26); // 25.5 -> 26
  });

  it('fixed coupons discount their value in cents', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 200, ...base };
    expect(discountForCoupon(c, 5000, NOW)).toBe(200);
  });

  it('clamps the discount to the subtotal', () => {
    const c: Coupon = { code: 'X', type: 'fixed', value: 99999, ...base };
    expect(discountForCoupon(c, 400, NOW)).toBe(400);
  });
});
