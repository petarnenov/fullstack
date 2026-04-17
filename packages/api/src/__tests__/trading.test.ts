import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  InMemoryTradingRepository,
  SymbolNotFoundError,
} from "../domains/trading/trading.repository";

describe("Trading repository", () => {
  let repo: InMemoryTradingRepository;

  beforeEach(() => {
    repo = new InMemoryTradingRepository();
  });

  it("lists symbols with current price", () => {
    const symbols = repo.listSymbols();
    expect(symbols.length).toBeGreaterThan(0);
    expect(symbols[0]).toHaveProperty("ticker");
    expect(symbols[0]).toHaveProperty("lastPrice");
  });

  it("hydrates positions with market value and PnL", () => {
    const positions = repo.listPositions();
    for (const p of positions) {
      expect(p.marketValue).toBeGreaterThan(0);
      expect(typeof p.unrealizedPnL).toBe("number");
    }
  });

  it("filling a buy order grows the position with blended avg cost", () => {
    const symbol = repo
      .listSymbols()
      .find((s) => s.ticker === "AAPL")!;
    const before = repo.listPositions().find((p) => p.ticker === "AAPL")!;

    const order = repo.placeOrder({
      ticker: "AAPL",
      side: "buy",
      quantity: 10,
    });
    expect(order.status).toBe("filled");
    expect(order.fillPrice).toBe(symbol.lastPrice);

    const after = repo.listPositions().find((p) => p.ticker === "AAPL")!;
    expect(after.quantity).toBe(before.quantity + 10);

    const expectedAvg =
      (before.quantity * before.averageCost + 10 * symbol.lastPrice) /
      (before.quantity + 10);
    expect(after.averageCost).toBeCloseTo(expectedAvg, 2);
  });

  it("filling a sell order shrinks the position", () => {
    const before = repo.listPositions().find((p) => p.ticker === "AAPL")!;
    const order = repo.placeOrder({
      ticker: "AAPL",
      side: "sell",
      quantity: 5,
    });
    expect(order.status).toBe("filled");

    const after = repo.listPositions().find((p) => p.ticker === "AAPL");
    expect(after?.quantity).toBe(before.quantity - 5);
  });

  it("rejects sells that exceed held quantity", () => {
    const order = repo.placeOrder({
      ticker: "AAPL",
      side: "sell",
      quantity: 9999,
    });
    expect(order.status).toBe("rejected");
    expect(order.rejectionReason).toMatch(/Insufficient/i);
  });

  it("buying a new ticker creates a fresh position", () => {
    expect(
      repo.listPositions().find((p) => p.ticker === "TSLA"),
    ).toBeUndefined();

    const order = repo.placeOrder({
      ticker: "TSLA",
      side: "buy",
      quantity: 4,
    });
    expect(order.status).toBe("filled");
    const created = repo.listPositions().find((p) => p.ticker === "TSLA");
    expect(created?.quantity).toBe(4);
  });

  it("throws for unknown tickers", () => {
    expect(() =>
      repo.placeOrder({ ticker: "DOES_NOT_EXIST", side: "buy", quantity: 1 }),
    ).toThrow(SymbolNotFoundError);
  });

  it("portfolio summary totals match positions", () => {
    const summary = repo.getPortfolio();
    const positions = repo.listPositions();

    const expectedValue = positions.reduce((s, p) => s + p.marketValue, 0);
    expect(summary.totalMarketValue).toBeCloseTo(expectedValue, 2);
    expect(summary.positionsCount).toBe(positions.length);
    expect(summary.topHoldingTicker).toBeTruthy();
  });
});
