import { z } from "zod";

export const OrderSideEnum = z.enum(["buy", "sell"]);
export const OrderStatusEnum = z.enum(["filled", "rejected"]);

export const SymbolSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  sector: z.string(),
  lastPrice: z.number(),
  change24h: z.number(),
});

export const PositionSchema = z.object({
  accountId: z.string(),
  ticker: z.string(),
  name: z.string(),
  quantity: z.number(),
  averageCost: z.number(),
  marketValue: z.number(),
  unrealizedPnL: z.number(),
  unrealizedPnLPercent: z.number(),
});

export const OrderSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  ticker: z.string(),
  side: OrderSideEnum,
  quantity: z.number(),
  fillPrice: z.number(),
  total: z.number(),
  status: OrderStatusEnum,
  rejectionReason: z.string().nullable(),
  placedAt: z.string(),
});

export const PlaceOrderRequestSchema = z.object({
  accountId: z.string().min(1),
  ticker: z.string().min(1),
  side: OrderSideEnum,
  quantity: z.number().positive(),
});

export const PortfolioSummarySchema = z.object({
  accountId: z.string().nullable(),
  cashAvailable: z.number(),
  totalMarketValue: z.number(),
  totalCostBasis: z.number(),
  totalUnrealizedPnL: z.number(),
  totalUnrealizedPnLPercent: z.number(),
  totalEquity: z.number(),
  positionsCount: z.number(),
  topHoldingTicker: z.string().nullable(),
});

export const CashBalanceSchema = z.object({
  accountId: z.string(),
  cashAvailable: z.number(),
  currency: z.literal("USD"),
});

export const TradingAccountViewSchema = z.object({
  accountId: z.string(),
  cashAvailable: z.number(),
  currency: z.literal("USD"),
});

export const DepositRequestSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().positive(),
});

export type OrderSide = z.infer<typeof OrderSideEnum>;
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export type Symbol = z.infer<typeof SymbolSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;
export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;
export type CashBalance = z.infer<typeof CashBalanceSchema>;
export type TradingAccountView = z.infer<typeof TradingAccountViewSchema>;
export type DepositRequest = z.infer<typeof DepositRequestSchema>;

export const INITIAL_CASH_USD = 1_000_000;
export const SEEDED_ACCOUNT_IDS = [
  "acc_verified_1",
  "acc_verified_2",
  "acc_kyc_1",
  "acc_draft_1",
] as const;
