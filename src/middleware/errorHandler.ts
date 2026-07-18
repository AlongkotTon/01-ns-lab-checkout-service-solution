import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 400;
  const message = err instanceof Error ? err.message : 'internal server error';
  res.status(status).json({ error: message });
}
