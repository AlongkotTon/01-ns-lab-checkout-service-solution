import { Coupon } from '../types';
import { createAsyncStore } from './asyncStore';

export const couponRepo = createAsyncStore<Coupon>((c) => c.code);
