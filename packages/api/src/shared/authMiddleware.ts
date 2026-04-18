import type { CookieOptions, NextFunction, Request, Response } from "express";
import { authRepository } from "../domains/auth/auth.repository";
import type { IssuedSession } from "../domains/auth/auth.repository";
import type { AuthenticatedUser } from "../domains/auth/auth.schemas";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthenticatedUser;
    sessionCsrfToken?: string;
  }
}

export const ACCESS_COOKIE = "amp_access_token";
export const REFRESH_COOKIE = "amp_refresh_token";
export const CSRF_COOKIE = "amp_csrf_token";
export const CSRF_HEADER = "x-csrf-token";

const isProd = process.env.NODE_ENV === "production";

function accessCookieOpts(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api",
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

function refreshCookieOpts(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/api/auth",
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

function csrfCookieOpts(maxAge?: number): CookieOptions {
  return {
    httpOnly: false,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

export function setSessionCookies(res: Response, session: IssuedSession): void {
  const accessMaxAge = Math.max(session.accessExpiresAt - Date.now(), 0);
  const refreshMaxAge = Math.max(session.refreshExpiresAt - Date.now(), 0);
  res.cookie(ACCESS_COOKIE, session.accessToken, accessCookieOpts(accessMaxAge));
  res.cookie(REFRESH_COOKIE, session.refreshToken, refreshCookieOpts(refreshMaxAge));
  res.cookie(CSRF_COOKIE, session.csrfToken, csrfCookieOpts(refreshMaxAge));
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, accessCookieOpts());
  res.clearCookie(REFRESH_COOKIE, refreshCookieOpts());
  res.clearCookie(CSRF_COOKIE, csrfCookieOpts());
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const result = authRepository.findUserByAccessToken(token);
  if (!result) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  req.user = result.user;
  req.sessionCsrfToken = result.csrfToken;
  next();
}

// Double-submit cookie CSRF: the client echoes the csrf cookie value in an
// X-CSRF-Token header on state-changing requests. Cross-site attackers can't
// read the cookie (SameSite=Strict) or set custom headers without a CORS
// preflight, so a match implies same-origin intent.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  const headerToken = req.header(CSRF_HEADER);
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    res.status(403).json({ error: "CSRF token missing or invalid" });
    return;
  }
  next();
}
