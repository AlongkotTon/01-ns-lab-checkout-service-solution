import { productRepo } from '../repositories/productRepo';
import { withLock } from '../lib/locks';
import { NotFoundError } from '../lib/errors';

/**
 * Reserve `quantity` units of `sku`. Returns true if the reservation
 * succeeded. Stock never goes below zero — the read-check-write section
 * is serialized per SKU with an async lock, so concurrent reservations
 * of the last unit cannot both succeed (the Lab B QA-track bug).
 * Quantity must be positive, otherwise stock could be inflated.
 */
export async function reserve(sku: string, quantity: number): Promise<boolean> {
  if (quantity <= 0) throw new Error(`quantity must be positive for ${sku}`);
  return withLock(`sku:${sku}`, async () => {
    const product = await productRepo.get(sku);
    if (!product) throw new NotFoundError(`unknown sku: ${sku}`);

    if (product.stock < quantity) return false;

    await productRepo.put({ ...product, stock: product.stock - quantity });
    return true;
  });
}

export async function release(sku: string, quantity: number): Promise<void> {
  if (quantity <= 0) throw new Error(`quantity must be positive for ${sku}`);
  await withLock(`sku:${sku}`, async () => {
    const product = await productRepo.get(sku);
    if (!product) throw new NotFoundError(`unknown sku: ${sku}`);
    await productRepo.put({ ...product, stock: product.stock + quantity });
  });
}

export async function available(sku: string): Promise<number> {
  const product = await productRepo.get(sku);
  return product?.stock ?? 0;
}
