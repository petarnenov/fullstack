import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./swagger";
import { authRouter } from "./domains/auth/auth.router";
import { billingRouter } from "./domains/billing/billing.router";
import { accountsRouter } from "./domains/accounts/accounts.router";
import { tradingRouter } from "./domains/trading/trading.router";
import { requireAuth, requireCsrf } from "./shared/authMiddleware";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Reflect the Origin header + allow credentials so httpOnly cookies survive
// cross-origin fetches in dev (vite proxy forwards them as same-origin, but
// when exposing on LAN/browsers other than the API host this matters). Lock
// the allow-list down in production.
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api/auth", authRouter);
app.use("/api/billing", requireAuth, requireCsrf, billingRouter);
app.use("/api/accounts", requireAuth, requireCsrf, accountsRouter);
app.use("/api/trading", requireAuth, requireCsrf, tradingRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`   /api/auth     → Platform Core team`);
  console.log(`   /api/billing  → Billing team (auth required)`);
  console.log(`   /api/accounts → Open Account team (auth required)`);
  console.log(`   /api/trading  → Trading team (auth required)`);
});

// Graceful shutdown so Ctrl+C under tsx watch doesn't need the 5s force-kill.
// server.close() alone waits for keep-alive connections (shell + MFE long-poll
// React Query requests), so we also destroy active sockets explicitly.
const shutdown = (signal: NodeJS.Signals) => {
  console.log(`\n${signal} received — shutting down`);
  server.closeAllConnections();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 2000).unref();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
