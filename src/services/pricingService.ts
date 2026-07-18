import { CartLine, PriceBreakdown } from '../types';
import { productRepo } from '../repositories/productRepo';
import { NotFoundError } from '../lib/errors';

const TAX_BPS = 700; // 7.00% expressed in basis points

export async function computeSubtotal(lines: CartLine[]): Promise<number> {
  let subtotal = 0;
  for (const line of lines) {
    if (line.quantity <= 0) throw new Error(`quantity must be positive for ${line.sku}`);
    const product = await productRepo.get(line.sku);
    if (!product) throw new NotFoundError(`unknown sku: ${line.sku}`);
    subtotal += product.priceCents * line.quantity;
  }
  return subtotal;
}

/** Tax on an amount of cents, rounded half-up. */
export function taxOf(amountCents: number): number {
  return Math.round((amountCents * TAX_BPS) / 10000);
}

/**
 * Price a cart. `discountCents` is supplied by the caller (Dev track will
 * wire couponService in). Tax is charged on (subtotal - discount).
 * Discount is clamped so it can never exceed the subtotal.
 */
export async function priceCart(lines: CartLine[], discountCents = 0): Promise<PriceBreakdown> {
  const subtotalCents = await computeSubtotal(lines);
  const discount = Math.max(0, Math.min(discountCents, subtotalCents));
  const taxable = subtotalCents - discount;
  const taxCents = taxOf(taxable);
  return { subtotalCents, discountCents: discount, taxCents, totalCents: taxable + taxCents };
}
