import { Product } from '../types';
import { createAsyncStore } from './asyncStore';

export const productRepo = createAsyncStore<Product>((p) => p.sku);
