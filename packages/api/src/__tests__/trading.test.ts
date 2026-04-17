import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  InMemoryTradingRepository,
  SymbolNotFoundError,
} from "../domains/trading/trading.repository";
import {
  INITIAL_CASH_USD,
  SEEDED_ACCOUNT_IDS,
} from "../domains/trading/trading.schemas";

const PRIMARY = "acc_verified_1";
const SECONDARY = "acc_verified_2";

describe("Trading repository", () => {
  let repo: InMemoryTradingRepository;

  beforeEach(() => {
    repo = new InMemoryTradingRepository();
  });

  describe("symbols & positions", () => {
    it("lists symbols with current price", () => {
      const symbols = repo.listSymbols();
      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols[0]).toHaveProperty("ticker");
      expect(symbols[0]).toHaveProperty("lastPrice");
    });

    it("hydrates positions with market value and PnL", () => {
      const positions = repo.listPositions(PRIMARY);
      expect(positions.length).toBeGreaterThan(0);
      for (const p of positions) {
        expect(p.accountId).toBe(PRIMARY);
        expect(p.marketValue).toBeGreaterThan(0);
        expect(typeof p.unrealizedPnL).toBe("number");
      }
    });

    it("filters positions by accountId (secondary account is empty)", () => {
      expect(repo.listPositions(SECONDARY)).toEqual([]);
    });
  });

  describe("cash ledger", () => {
    it("seeds every known account; primary reflects the seeded positions", () => {
      const accounts = repo.listTradingAccounts();
      const ids = accounts.map((a) => a.accountId).sort();
      expect(ids).toEqual([...SEEDED_ACCOUNT_IDS].sort());

      const secondary = accounts.find((a) => a.accountId === SECONDARY)!;
      expect(secondary.cashAvailable).toBe(INITIAL_CASH_USD);

      const primary = accounts.find((a) => a.accountId === PRIMARY)!;
      // Primary has 3 seeded buys; cash = 1,000,000 − total cost basis
      expect(primary.cashAvailable).toBeLessThan(INITIAL_CASH_USD);
      expect(primary.cashAvailable).toBeGreaterThan(0);
    });

    it("deposit increases the balance", () => {
      const before = repo.getCash(SECONDARY).cashAvailable;
      const updated = repo.deposit({ accountId: SECONDARY, amount: 2500 });
      expect(updated.cashAvailable).toBeCloseTo(before + 2500, 2);
      expect(repo.getCash(SECONDARY).cashAvailable).toBeCloseTo(
        before + 2500,
        2,
      );
    });

    it("lazy-inits unseen accountIds to 1,000,000", () => {
      const cash = repo.getCash("acc_brand_new");
      expect(cash.cashAvailable).toBe(INITIAL_CASH_USD);
      expect(
        repo.listTradingAccounts().some((a) => a.accountId === "acc_brand_new"),
      ).toBe(true);
    });
  });

  describe("order placement against cash + positions", () => {
    it("buy debits cash and grows position with blended avg cost", () => {
      const symbol = repo.listSymbols().find((s) => s.ticker === "AAPL")!;
      const cashBefore = repo.getCash(PRIMARY).cashAvailable;
      const qtyBefore =
        repo.listPositions(PRIMARY).find((p) => p.ticker === "AAPL")
          ?.quantity ?? 0;

      const order = repo.placeOrder({
        accountId: PRIMARY,
        ticker: "AAPL",
        side: "buy",
        quantity: 10,
      });
      expect(order.status).toBe("filled");
      expect(order.accountId).toBe(PRIMARY);

      const cashAfter = repo.getCash(PRIMARY).cashAvailable;
      expect(cashAfter).toBeCloseTo(cashBefore - order.total, 2);

      const qtyAfter =
        repo.listPositions(PRIMARY).find((p) => p.ticker === "AAPL")
          ?.quantity ?? 0;
      expect(qtyAfter).toBe(qtyBefore + 10);
      expect(order.fillPrice).toBe(symbol.lastPrice);
    });

    it("sell credits cash and shrinks position", () => {
      const cashBefore = repo.getCash(PRIMARY).cashAvailable;
      const order = repo.placeOrder({
        accountId: PRIMARY,
        ticker: "AAPL",
        side: "sell",
        quantity: 5,
      });
      expect(order.status).toBe("filled");

      const cashAfter = repo.getCash(PRIMARY).cashAvailable;
      expect(cashAfter).toBeCloseTo(cashBefore + order.total, 2);
    });

    it("buy with insufficient cash is rejected (409)", () => {
      const symbol = repo.listSymbols().find((s) => s.ticker === "AAPL")!;
      // A fresh account has 1M cash; buying enough AAPL to blow past it
      const qty = Math.ceil(INITIAL_CASH_USD / symbol.lastPrice) + 10;

      const order = repo.placeOrder({
        accountId: "acc_broke_test",
        ticker: "AAPL",
        side: "buy",
        quantity: qty,
      });
      expect(order.status).toBe("rejected");
      expect(order.rejectionReason).toMatch(/Insufficient cash/i);
      // Cash must not have moved
      expect(repo.getCash("acc_broke_test").cashAvailable).toBe(
        INITIAL_CASH_USD,
      );
    });

    it("sell more than held is rejected", () => {
      const order = repo.placeOrder({
        accountId: PRIMARY,
        ticker: "AAPL",
        side: "sell",
        quantity: 9999,
      });
      expect(order.status).toBe("rejected");
      expect(order.rejectionReason).toMatch(/Insufficient position/i);
    });

    it("buying on a brand-new account lazy-seeds cash then debits", () => {
      const newAccount = "acc_virgin_test";
      const order = repo.placeOrder({
        accountId: newAccount,
        ticker: "AAPL",
        side: "buy",
        quantity: 5,
      });
      expect(order.status).toBe("filled");
      expect(repo.getCash(newAccount).cashAvailable).toBeCloseTo(
        INITIAL_CASH_USD - order.total,
        2,
      );
    });

    it("buying a new ticker creates a fresh position on that account", () => {
      expect(
        repo.listPositions(SECONDARY).find((p) => p.ticker === "TSLA"),
      ).toBeUndefined();

      repo.placeOrder({
        accountId: SECONDARY,
        ticker: "TSLA",
        side: "buy",
        quantity: 4,
      });
      const created = repo
        .listPositions(SECONDARY)
        .find((p) => p.ticker === "TSLA");
      expect(created?.quantity).toBe(4);
    });

    it("positions are isolated per account", () => {
      repo.placeOrder({
        accountId: SECONDARY,
        ticker: "MSFT",
        side: "buy",
        quantity: 2,
      });
      // MSFT on SECONDARY should not surface on PRIMARY
      expect(
        repo.listPositions(PRIMARY).find((p) => p.ticker === "MSFT"),
      ).toBeUndefined();
    });

    it("throws for unknown tickers", () => {
      expect(() =>
        repo.placeOrder({
          accountId: PRIMARY,
          ticker: "DOES_NOT_EXIST",
          side: "buy",
          quantity: 1,
        }),
      ).toThrow(SymbolNotFoundError);
    });
  });

  describe("portfolio summary", () => {
    it("reflects positions plus cash as total equity", () => {
      const summary = repo.getPortfolio(PRIMARY);
      const cash = repo.getCash(PRIMARY).cashAvailable;
      const mv = summary.totalMarketValue;
      expect(summary.cashAvailable).toBeCloseTo(cash, 2);
      expect(summary.totalEquity).toBeCloseTo(cash + mv, 2);
      expect(summary.accountId).toBe(PRIMARY);
    });

    it("secondary account with no positions still has 1M equity", () => {
      const summary = repo.getPortfolio(SECONDARY);
      expect(summary.totalMarketValue).toBe(0);
      expect(summary.cashAvailable).toBe(INITIAL_CASH_USD);
      expect(summary.totalEquity).toBe(INITIAL_CASH_USD);
      expect(summary.positionsCount).toBe(0);
    });
  });
});
