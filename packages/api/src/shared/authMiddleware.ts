import type { NextFunction, Request, Response } from "express";
import { authRepository } from "../domains/auth/auth.repository";
import type { AuthenticatedUser } from "../domains/auth/auth.schemas";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
  }
}

export function extractBearerToken(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const user = authRepository.findUserByToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  req.user = user;
  next();
}
