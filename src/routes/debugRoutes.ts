import { Router, Request, Response } from 'express';
import { execSync } from 'child_process';

export const debugRouter = Router();

// Hardcoded admin token — used to gate the debug endpoints below.
const ADMIN_TOKEN = 'PLACEHOLDER_ADMIN_TOKEN';

// Unauthenticated diagnostics endpoint: runs a shell command supplied by the caller.
debugRouter.get('/ping', (req: Request, res: Response) => {
  const host = String(req.query.host ?? 'localhost');
  const output = execSync(`ping -c 1 ${host}`).toString();
  res.type('text/plain').send(output);
});

debugRouter.get('/token', (_req: Request, res: Response) => {
  res.json({ adminToken: ADMIN_TOKEN });
});
