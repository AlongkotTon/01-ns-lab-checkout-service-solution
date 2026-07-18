import { CartLine, PriceBreakdown } from '../types';
import { getProductOrThrow } from '../repositories/productRepo';

const TAX_BPS = 700; // 7.00% expressed in basis points

export async function computeSubtotal(lines: CartLine[]): Promise<number> {
  let subtotal = 0;
  for (const line of lines) {
    if (line.quantity <= 0) throw new Error(`quantity must be positive for ${line.sku}`);
    const product = await getProductOrThrow(line.sku);
    subtotal += product.priceCents * line.quantity;
  }
  return subtotal;
}

/** Tax on an amount of cents, rounded half-up. */
export function taxOf(amountCents: number): number {
  return Math.round((amountCents * TAX_BPS) / 10000);
}

/**
 * Build a price breakdown from a known subtotal. Tax is charged on
 * (subtotal - discount); the discount is clamped so it can never exceed the
 * subtotal. Pure — callers that already have the subtotal avoid recomputing it.
 */
export function breakdownFor(subtotalCents: number, discountCents = 0): PriceBreakdown {
  const discount = Math.max(0, Math.min(discountCents, subtotalCents));
  const taxable = subtotalCents - discount;
  const taxCents = taxOf(taxable);
  return { subtotalCents, discountCents: discount, taxCents, totalCents: taxable + taxCents };
}

/** Price a cart end to end (fetches prices, then builds the breakdown). */
export async function priceCart(lines: CartLine[], discountCents = 0): Promise<PriceBreakdown> {
  return breakdownFor(await computeSubtotal(lines), discountCents);
}
