import { Order } from '../types';
import { createAsyncStore } from './asyncStore';

export const orderRepo = createAsyncStore<Order>((o) => o.id);
