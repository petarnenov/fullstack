import {
  INITIAL_CASH_USD,
  SEEDED_ACCOUNT_IDS,
  type CashBalance,
  type DepositRequest,
  type Order,
  type OrderSide,
  type PlaceOrderRequest,
  type PortfolioSummary,
  type Position,
  type Symbol,
  type TradingAccountView,
} from "./trading.schemas";

interface StoredPosition {
  accountId: string;
  ticker: string;
  quantity: number;
  averageCost: number;
}

export class SymbolNotFoundError extends Error {}
export class AccountNotFoundError extends Error {}

export interface ITradingRepository {
  listSymbols(): Symbol[];
  listTradingAccounts(): TradingAccountView[];
  getCash(accountId: string): CashBalance;
  deposit(input: DepositRequest): CashBalance;
  listPositions(accountId?: string): Position[];
  listOrders(accountId?: string): Order[];
  placeOrder(input: PlaceOrderRequest): Order;
  getPortfolio(accountId: string): PortfolioSummary;
}

export class InMemoryTradingRepository implements ITradingRepository {
  private readonly symbols: Symbol[] = [
    { ticker: "AAPL", name: "Apple Inc.", sector: "Technology", lastPrice: 187.42, change24h: 1.23 },
    { ticker: "MSFT", name: "Microsoft Corp.", sector: "Technology", lastPrice: 412.15, change24h: -0.84 },
    { ticker: "NVDA", name: "NVIDIA Corp.", sector: "Semiconductors", lastPrice: 945.6, change24h: 3.91 },
    { ticker: "GOOGL", name: "Alphabet Inc.", sector: "Technology", lastPrice: 164.22, change24h: 0.45 },
    { ticker: "AMZN", name: "Amazon.com Inc.", sector: "Consumer", lastPrice: 178.55, change24h: -1.12 },
    { ticker: "TSLA", name: "Tesla Inc.", sector: "Automotive", lastPrice: 248.17, change24h: 2.67 },
    { ticker: "META", name: "Meta Platforms", sector: "Technology", lastPrice: 512.4, change24h: -0.28 },
    { ticker: "JPM", name: "JPMorgan Chase", sector: "Financials", lastPrice: 205.8, change24h: 0.18 },
  ];

  // Seed data: existing positions go on the primary verified account so the
  // demo has non-trivial PnL out of the box.
  private readonly positions: StoredPosition[] = [
    { accountId: "acc_verified_1", ticker: "AAPL", quantity: 42, averageCost: 170.25 },
    { accountId: "acc_verified_1", ticker: "NVDA", quantity: 6, averageCost: 620.1 },
    { accountId: "acc_verified_1", ticker: "JPM", quantity: 25, averageCost: 198.55 },
  ];

  private readonly orders: Order[] = [
    {
      id: "ord_3001",
      accountId: "acc_verified_1",
      ticker: "AAPL",
      side: "buy",
      quantity: 10,
      fillPrice: 170.25,
      total: 1702.5,
      status: "filled",
      rejectionReason: null,
      placedAt: iso(-18),
    },
    {
      id: "ord_3002",
      accountId: "acc_verified_1",
      ticker: "NVDA",
      side: "buy",
      quantity: 6,
      fillPrice: 620.1,
      total: 3720.6,
      status: "filled",
      rejectionReason: null,
      placedAt: iso(-12),
    },
    {
      id: "ord_3003",
      accountId: "acc_verified_1",
      ticker: "AAPL",
      side: "buy",
      quantity: 32,
      fillPrice: 170.25,
      total: 5448.0,
      status: "filled",
      rejectionReason: null,
      placedAt: iso(-6),
    },
  ];

  /**
   * Per-account cash ledger. Seeded on construction for known accounts; lazy-
   * initialised to INITIAL_CASH_USD on first access for any unseen accountId.
   * Money is stored in whole dollar precision via round2 at read/write — this
   * is a POC, not a real ledger (no double-entry, no rounding audits, no
   * currency besides USD).
   */
  private readonly cashLedger = new Map<string, number>();

  private nextOrderId = 3004;

  constructor() {
    for (const id of SEEDED_ACCOUNT_IDS) {
      this.cashLedger.set(id, INITIAL_CASH_USD);
    }
    // Reflect the seeded positions in cash: the primary account's
    // cash starts at INITIAL_CASH_USD minus the cost of seeded positions,
    // so "deposit 1M then bought AAPL+NVDA+JPM" is the implicit story.
    const primary = "acc_verified_1";
    const seedCost = this.positions
      .filter((p) => p.accountId === primary)
      .reduce((sum, p) => sum + p.quantity * p.averageCost, 0);
    this.cashLedger.set(primary, round2(INITIAL_CASH_USD - seedCost));
  }

  listSymbols(): Symbol[] {
    return [...this.symbols];
  }

  listTradingAccounts(): TradingAccountView[] {
    return Array.from(this.cashLedger.entries())
      .map(([accountId, cashAvailable]) => ({
        accountId,
        cashAvailable: round2(cashAvailable),
        currency: "USD" as const,
      }))
      .sort((a, b) => a.accountId.localeCompare(b.accountId));
  }

  getCash(accountId: string): CashBalance {
    const cash = this.ensureAccount(accountId);
    return {
      accountId,
      cashAvailable: round2(cash),
      currency: "USD",
    };
  }

  deposit(input: DepositRequest): CashBalance {
    const current = this.ensureAccount(input.accountId);
    const next = round2(current + input.amount);
    this.cashLedger.set(input.accountId, next);
    return {
      accountId: input.accountId,
      cashAvailable: next,
      currency: "USD",
    };
  }

  listPositions(accountId?: string): Position[] {
    const filtered = accountId
      ? this.positions.filter((p) => p.accountId === accountId)
      : this.positions;
    return filtered.map((p) => this.hydratePosition(p));
  }

  listOrders(accountId?: string): Order[] {
    const filtered = accountId
      ? this.orders.filter((o) => o.accountId === accountId)
      : this.orders;
    return [...filtered].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  placeOrder(input: PlaceOrderRequest): Order {
    const symbol = this.symbols.find((s) => s.ticker === input.ticker);
    if (!symbol) throw new SymbolNotFoundError(`Unknown ticker ${input.ticker}`);

    this.ensureAccount(input.accountId);

    const existing = this.positions.find(
      (p) => p.accountId === input.accountId && p.ticker === input.ticker,
    );
    const price = symbol.lastPrice;
    const total = round2(price * input.quantity);

    if (input.side === "sell") {
      if (!existing || existing.quantity < input.quantity) {
        return this.recordRejected(
          input,
          price,
          `Insufficient position: have ${existing?.quantity ?? 0}, tried to sell ${input.quantity}`,
        );
      }
    } else {
      const available = this.cashLedger.get(input.accountId) ?? 0;
      if (available < total) {
        return this.recordRejected(
          input,
          price,
          `Insufficient cash: have $${round2(available)}, need $${total}`,
        );
      }
    }

    const order: Order = {
      id: `ord_${this.nextOrderId++}`,
      accountId: input.accountId,
      ticker: symbol.ticker,
      side: input.side,
      quantity: input.quantity,
      fillPrice: price,
      total,
      status: "filled",
      rejectionReason: null,
      placedAt: new Date().toISOString(),
    };
    this.orders.unshift(order);
    this.applyToPosition(order);
    this.applyToCash(order);
    return order;
  }

  getPortfolio(accountId: string): PortfolioSummary {
    this.ensureAccount(accountId);
    const positions = this.listPositions(accountId);
    const totalMarketValue = round2(
      positions.reduce((sum, p) => sum + p.marketValue, 0),
    );
    const totalCostBasis = round2(
      positions.reduce((sum, p) => sum + p.averageCost * p.quantity, 0),
    );
    const totalUnrealizedPnL = round2(totalMarketValue - totalCostBasis);
    const totalUnrealizedPnLPercent = totalCostBasis
      ? round2((totalUnrealizedPnL / totalCostBasis) * 100)
      : 0;
    const cashAvailable = round2(this.cashLedger.get(accountId) ?? 0);
    const totalEquity = round2(totalMarketValue + cashAvailable);

    const topHolding = positions.reduce<Position | null>((best, p) => {
      if (!best || p.marketValue > best.marketValue) return p;
      return best;
    }, null);

    return {
      accountId,
      cashAvailable,
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent,
      totalEquity,
      positionsCount: positions.length,
      topHoldingTicker: topHolding?.ticker ?? null,
    };
  }

  private ensureAccount(accountId: string): number {
    const current = this.cashLedger.get(accountId);
    if (current !== undefined) return current;
    this.cashLedger.set(accountId, INITIAL_CASH_USD);
    return INITIAL_CASH_USD;
  }

  private hydratePosition(stored: StoredPosition): Position {
    const symbol = this.symbols.find((s) => s.ticker === stored.ticker);
    const lastPrice = symbol?.lastPrice ?? stored.averageCost;
    const name = symbol?.name ?? stored.ticker;
    const marketValue = round2(stored.quantity * lastPrice);
    const costBasis = stored.averageCost * stored.quantity;
    const unrealizedPnL = round2(marketValue - costBasis);
    const unrealizedPnLPercent = costBasis
      ? round2((unrealizedPnL / costBasis) * 100)
      : 0;

    return {
      accountId: stored.accountId,
      ticker: stored.ticker,
      name,
      quantity: stored.quantity,
      averageCost: round2(stored.averageCost),
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
    };
  }

  private applyToPosition(order: Order): void {
    const existingIdx = this.positions.findIndex(
      (p) => p.accountId === order.accountId && p.ticker === order.ticker,
    );

    if (order.side === "buy") {
      if (existingIdx === -1) {
        this.positions.push({
          accountId: order.accountId,
          ticker: order.ticker,
          quantity: order.quantity,
          averageCost: order.fillPrice,
        });
        return;
      }
      const existing = this.positions[existingIdx];
      const newQty = existing.quantity + order.quantity;
      const newCost =
        (existing.quantity * existing.averageCost +
          order.quantity * order.fillPrice) /
        newQty;
      this.positions[existingIdx] = {
        ...existing,
        quantity: newQty,
        averageCost: newCost,
      };
      return;
    }

    // sell
    if (existingIdx === -1) return;
    const existing = this.positions[existingIdx];
    const remaining = existing.quantity - order.quantity;
    if (remaining <= 0) {
      this.positions.splice(existingIdx, 1);
      return;
    }
    this.positions[existingIdx] = { ...existing, quantity: remaining };
  }

  private applyToCash(order: Order): void {
    const current = this.cashLedger.get(order.accountId) ?? 0;
    const next =
      order.side === "buy" ? current - order.total : current + order.total;
    this.cashLedger.set(order.accountId, round2(next));
  }

  private recordRejected(
    input: PlaceOrderRequest,
    price: number,
    reason: string,
  ): Order {
    const rejected: Order = {
      id: `ord_${this.nextOrderId++}`,
      accountId: input.accountId,
      ticker: input.ticker,
      side: input.side satisfies OrderSide,
      quantity: input.quantity,
      fillPrice: price,
      total: round2(price * input.quantity),
      status: "rejected",
      rejectionReason: reason,
      placedAt: new Date().toISOString(),
    };
    this.orders.unshift(rejected);
    return rejected;
  }
}

function iso(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(14, 30, 0, 0);
  return d.toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const tradingRepository: ITradingRepository =
  new InMemoryTradingRepository();
