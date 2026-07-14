import { Router, Request, Response } from 'express';
import { productRepo } from '../repositories/productRepo';

export const productRouter = Router();

productRouter.get('/', async (_req: Request, res: Response) => {
  res.json({ products: await productRepo.all() });
});
