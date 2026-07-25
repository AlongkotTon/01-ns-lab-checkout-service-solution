import { Router, Request, Response, NextFunction } from "express";
import { register, login } from "../services/authService";

export const authRouter = Router();

authRouter.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await register({
        username: req.body?.username ?? "",
        password: req.body?.password ?? "",
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await login({
        username: req.body?.username ?? "",
        password: req.body?.password ?? "",
      });
      if (!result) {
        res.status(401).json({ error: "invalid username or password" });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
