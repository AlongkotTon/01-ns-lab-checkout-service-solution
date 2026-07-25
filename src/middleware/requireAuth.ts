import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/authService";

/** Responds 401 directly (never throws) so errorHandler's blanket 400 doesn't apply. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const [scheme, token] = (req.header("Authorization") ?? "").split(" ");
  const session =
    scheme === "Bearer" && token ? await verifyToken(token) : null;
  if (!session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
