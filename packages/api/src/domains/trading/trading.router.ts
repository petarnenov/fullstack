import { Router } from "express";
import { PlaceOrderRequestSchema } from "./trading.schemas";
import {
  SymbolNotFoundError,
  tradingRepository,
} from "./trading.repository";

export const tradingRouter = Router();

tradingRouter.get("/symbols", (_req, res) => {
  res.json(tradingRepository.listSymbols());
});

tradingRouter.get("/positions", (_req, res) => {
  res.json(tradingRepository.listPositions());
});

tradingRouter.get("/orders", (_req, res) => {
  res.json(tradingRepository.listOrders());
});

tradingRouter.get("/portfolio", (_req, res) => {
  res.json(tradingRepository.getPortfolio());
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
