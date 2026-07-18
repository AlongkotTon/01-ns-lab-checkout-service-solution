import { Product } from '../types';
import { createAsyncStore } from './asyncStore';
import { NotFoundError } from '../lib/errors';

export const productRepo = createAsyncStore<Product>((p) => p.sku);

/** Fetch a product by SKU or throw NotFoundError (mapped to HTTP 404). */
export async function getProductOrThrow(sku: string): Promise<Product> {
  const product = await productRepo.get(sku);
  if (!product) throw new NotFoundError(`unknown sku: ${sku}`);
  return product;
}
