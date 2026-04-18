import { Router } from "express";
import rateLimit from "express-rate-limit";
import { LoginRequestSchema } from "./auth.schemas";
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  authRepository,
} from "./auth.repository";
import {
  REFRESH_COOKIE,
  clearSessionCookies,
  requireAuth,
  requireCsrf,
  setSessionCookies,
} from "../../shared/authMiddleware";

const loginRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, slow down and retry shortly" },
});

const refreshRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Refresh flood detected, slow down" },
});

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, async (req, res) => {
  const parsed = LoginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login payload" });
    return;
  }
  try {
    const user = await authRepository.verifyCredentials(
      parsed.data.email,
      parsed.data.password,
    );
    const session = authRepository.issueSession(user.id);
    setSessionCookies(res, session);
    res.json({ user: session.user, csrfToken: session.csrfToken });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    res.status(500).json({ error: "Login failed" });
  }
});

// Refresh requires CSRF because a valid refresh cookie would otherwise be
// enough to rotate a session on behalf of a victim.
authRouter.post("/refresh", refreshRateLimit, requireCsrf, (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  try {
    const session = authRepository.rotateRefreshToken(refreshToken);
    setSessionCookies(res, session);
    res.json({ user: session.user, csrfToken: session.csrfToken });
  } catch (err) {
    if (err instanceof InvalidRefreshTokenError) {
      clearSessionCookies(res);
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }
    res.status(500).json({ error: "Refresh failed" });
  }
});

authRouter.post("/logout", requireCsrf, (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) authRepository.revokeRefreshToken(refreshToken);
  clearSessionCookies(res);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// Demo-only: the login page autofills from this endpoint. Gated so
// production builds don't leak working credentials.
if (process.env.NODE_ENV !== "production") {
  authRouter.get("/demo-credentials", (_req, res) => {
    res.json(authRepository.listDemoCredentials());
  });
}
