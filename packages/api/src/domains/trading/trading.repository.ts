import type {
  Order,
  OrderSide,
  PlaceOrderRequest,
  PortfolioSummary,
  Position,
  Symbol,
} from "./trading.schemas";

interface StoredPosition {
  ticker: string;
  quantity: number;
  averageCost: number;
}

export class SymbolNotFoundError extends Error {}
export class InsufficientPositionError extends Error {}

export interface ITradingRepository {
  listSymbols(): Symbol[];
  listPositions(): Position[];
  listOrders(): Order[];
  placeOrder(input: PlaceOrderRequest): Order;
  getPortfolio(): PortfolioSummary;
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

  private readonly positions: StoredPosition[] = [
    { ticker: "AAPL", quantity: 42, averageCost: 170.25 },
    { ticker: "NVDA", quantity: 6, averageCost: 620.1 },
    { ticker: "JPM", quantity: 25, averageCost: 198.55 },
  ];

  private readonly orders: Order[] = [
    {
      id: "ord_3001",
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

  private nextOrderId = 3004;

  listSymbols(): Symbol[] {
    return [...this.symbols];
  }

  listPositions(): Position[] {
    return this.positions.map((p) => this.hydratePosition(p));
  }

  listOrders(): Order[] {
    return [...this.orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  placeOrder(input: PlaceOrderRequest): Order {
    const symbol = this.symbols.find((s) => s.ticker === input.ticker);
    if (!symbol) throw new SymbolNotFoundError(`Unknown ticker ${input.ticker}`);

    const existing = this.positions.find((p) => p.ticker === input.ticker);

    if (input.side === "sell" && (!existing || existing.quantity < input.quantity)) {
      const rejected = this.rejectedOrder(
        input,
        symbol.lastPrice,
        `Insufficient position: have ${existing?.quantity ?? 0}, tried to sell ${input.quantity}`,
      );
      this.orders.unshift(rejected);
      return rejected;
    }

    const order: Order = {
      id: `ord_${this.nextOrderId++}`,
      ticker: symbol.ticker,
      side: input.side,
      quantity: input.quantity,
      fillPrice: symbol.lastPrice,
      total: round2(symbol.lastPrice * input.quantity),
      status: "filled",
      rejectionReason: null,
      placedAt: new Date().toISOString(),
    };
    this.orders.unshift(order);
    this.applyToPosition(order);
    return order;
  }

  getPortfolio(): PortfolioSummary {
    const positions = this.listPositions();
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

    const topHolding = positions.reduce<Position | null>((best, p) => {
      if (!best || p.marketValue > best.marketValue) return p;
      return best;
    }, null);

    return {
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedPnL,
      totalUnrealizedPnLPercent,
      positionsCount: positions.length,
      topHoldingTicker: topHolding?.ticker ?? null,
    };
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
    const existingIdx = this.positions.findIndex((p) => p.ticker === order.ticker);

    if (order.side === "buy") {
      if (existingIdx === -1) {
        this.positions.push({
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

  private rejectedOrder(
    input: PlaceOrderRequest,
    price: number,
    reason: string,
  ): Order {
    return {
      id: `ord_${this.nextOrderId++}`,
      ticker: input.ticker,
      side: input.side satisfies OrderSide,
      quantity: input.quantity,
      fillPrice: price,
      total: round2(price * input.quantity),
      status: "rejected",
      rejectionReason: reason,
      placedAt: new Date().toISOString(),
    };
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
