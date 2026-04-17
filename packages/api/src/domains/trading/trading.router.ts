import { Router } from "express";
import {
  DepositRequestSchema,
  PlaceOrderRequestSchema,
} from "./trading.schemas";
import {
  SymbolNotFoundError,
  tradingRepository,
} from "./trading.repository";

export const tradingRouter = Router();

tradingRouter.get("/symbols", (_req, res) => {
  res.json(tradingRepository.listSymbols());
});

tradingRouter.get("/accounts", (_req, res) => {
  res.json(tradingRepository.listTradingAccounts());
});

tradingRouter.get("/cash/:accountId", (req, res) => {
  res.json(tradingRepository.getCash(req.params.accountId));
});

tradingRouter.post("/cash/deposit", (req, res) => {
  const parsed = DepositRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid deposit", issues: parsed.error.issues });
  }
  const balance = tradingRepository.deposit(parsed.data);
  res.status(201).json(balance);
});

tradingRouter.get("/positions", (req, res) => {
  const accountId = typeof req.query.accountId === "string"
    ? req.query.accountId
    : undefined;
  res.json(tradingRepository.listPositions(accountId));
});

tradingRouter.get("/orders", (req, res) => {
  const accountId = typeof req.query.accountId === "string"
    ? req.query.accountId
    : undefined;
  res.json(tradingRepository.listOrders(accountId));
});

tradingRouter.get("/portfolio", (req, res) => {
  const accountId = typeof req.query.accountId === "string"
    ? req.query.accountId
    : null;
  if (!accountId) {
    return res.status(400).json({
      error: "Query param 'accountId' is required for portfolio summary",
    });
  }
  res.json(tradingRepository.getPortfolio(accountId));
});

tradingRouter.post("/orders", (req, res) => {
  const parsed = PlaceOrderRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid order", issues: parsed.error.issues });
  }

  try {
    const order = tradingRepository.placeOrder(parsed.data);
    const statusCode = order.status === "rejected" ? 409 : 201;
    res.status(statusCode).json(order);
  } catch (err) {
    if (err instanceof SymbolNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Order failed" });
  }
});
