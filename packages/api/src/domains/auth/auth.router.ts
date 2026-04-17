import { Router } from "express";
import { LoginRequestSchema } from "./auth.schemas";
import { InvalidCredentialsError, authRepository } from "./auth.repository";
import { extractBearerToken, requireAuth } from "../../shared/authMiddleware";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const parsed = LoginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid login payload" });
  }

  try {
    const result = authRepository.login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/logout", (req, res) => {
  const token = extractBearerToken(req);
  if (token) authRepository.logout(token);
  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

// Demo-only: list credentials so the login page can autofill them.
// Do NOT ship this in production.
authRouter.get("/demo-credentials", (_req, res) => {
  res.json(authRepository.listDemoCredentials());
});
