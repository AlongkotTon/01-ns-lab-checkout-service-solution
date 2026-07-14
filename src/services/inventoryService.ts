import { productRepo } from '../repositories/productRepo';
import { withLock } from '../lib/locks';

/**
 * Reserve `quantity` units of `sku`. Returns true if the reservation
 * succeeded. Stock never goes below zero — the read-check-write section
 * is serialized per SKU with an async lock, so concurrent reservations
 * of the last unit cannot both succeed (the Lab B QA-track bug).
 */
export async function reserve(sku: string, quantity: number): Promise<boolean> {
  return withLock(`sku:${sku}`, async () => {
    const product = await productRepo.get(sku);
    if (!product) throw new Error(`unknown sku: ${sku}`);

    if (product.stock < quantity) return false;

    await productRepo.put({ ...product, stock: product.stock - quantity });
    return true;
  });
}

export async function release(sku: string, quantity: number): Promise<void> {
  await withLock(`sku:${sku}`, async () => {
    const product = await productRepo.get(sku);
    if (!product) throw new Error(`unknown sku: ${sku}`);
    await productRepo.put({ ...product, stock: product.stock + quantity });
  });
}

export async function available(sku: string): Promise<number> {
  const product = await productRepo.get(sku);
  return product?.stock ?? 0;
}
