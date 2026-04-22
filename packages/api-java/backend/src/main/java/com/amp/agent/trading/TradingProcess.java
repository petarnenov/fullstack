package com.amp.agent.trading;

import com.amp.util.jsontransfer.CashBalanceJTO;
import com.amp.util.jsontransfer.OrderJTO;
import com.amp.util.jsontransfer.PortfolioSummaryJTO;
import com.amp.util.jsontransfer.PositionJTO;
import com.amp.util.jsontransfer.SymbolJTO;
import com.amp.util.jsontransfer.TradingAccountViewJTO;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * In-memory trading state, serialized through the single TradingManager agent.
 * Mirrors packages/api/src/domains/trading/trading.repository.ts, including
 * instant-fill orders, per-account cash ledger, and the hand-crafted seed data
 * that makes the demo Dashboard look non-trivial.
 */
public class TradingProcess {

    public static final double INITIAL_CASH_USD = 1_000_000.0;
    public static final List<String> SEEDED_ACCOUNT_IDS = Arrays.asList(
            "acc_verified_1", "acc_verified_2", "acc_kyc_1", "acc_draft_1");

    private static final List<SymbolJTO> SYMBOLS = new ArrayList<>();
    private static final List<StoredPosition> POSITIONS = new ArrayList<>();
    private static final List<OrderJTO> ORDERS = new ArrayList<>();
    private static final Map<String, Double> CASH_LEDGER = new HashMap<>();
    private static int nextOrderId = 3004;

    static {
        seedSymbols();
        seedPositions();
        seedOrders();
        seedCashLedger();
    }

    private TradingProcess() {}

    public static List<SymbolJTO> listSymbols() {
        return new ArrayList<>(SYMBOLS);
    }

    public static List<TradingAccountViewJTO> listTradingAccounts() {
        List<TradingAccountViewJTO> out = new ArrayList<>();
        // Sorted by accountId for stable output; TreeMap view keeps order consistent.
        for (Map.Entry<String, Double> e : new TreeMap<>(CASH_LEDGER).entrySet()) {
            TradingAccountViewJTO v = new TradingAccountViewJTO();
            v.setAccountId(e.getKey());
            v.setCashAvailable(round2(e.getValue()));
            v.setCurrency("USD");
            out.add(v);
        }
        return out;
    }

    public static CashBalanceJTO getCash(String accountId) {
        double cash = ensureAccount(accountId);
        CashBalanceJTO b = new CashBalanceJTO();
        b.setAccountId(accountId);
        b.setCashAvailable(round2(cash));
        b.setCurrency("USD");
        return b;
    }

    public static CashBalanceJTO deposit(String accountId, double amount) {
        double current = ensureAccount(accountId);
        double next = round2(current + amount);
        CASH_LEDGER.put(accountId, next);
        CashBalanceJTO b = new CashBalanceJTO();
        b.setAccountId(accountId);
        b.setCashAvailable(next);
        b.setCurrency("USD");
        return b;
    }

    public static List<PositionJTO> listPositions(String accountId) {
        List<PositionJTO> out = new ArrayList<>();
        for (StoredPosition p : POSITIONS) {
            if (accountId == null || accountId.equals(p.accountId)) {
                out.add(hydrate(p));
            }
        }
        return out;
    }

    public static List<OrderJTO> listOrders(String accountId) {
        List<OrderJTO> out = new ArrayList<>();
        for (OrderJTO o : ORDERS) {
            if (accountId == null || accountId.equals(o.getAccountId())) {
                out.add(o);
            }
        }
        out.sort(Comparator.comparing(OrderJTO::getPlacedAt).reversed());
        return out;
    }

    public static PlaceOrderResult placeOrder(String accountId, String ticker, String side, double quantity) {
        SymbolJTO symbol = findSymbol(ticker);
        if (symbol == null) return PlaceOrderResult.symbolNotFound();

        ensureAccount(accountId);
        double price = symbol.getLastPrice();
        double total = round2(price * quantity);

        StoredPosition existing = findPosition(accountId, ticker);

        if ("sell".equals(side)) {
            if (existing == null || existing.quantity < quantity) {
                double have = existing == null ? 0 : existing.quantity;
                return PlaceOrderResult.ok(recordRejected(accountId, ticker, side, quantity, price,
                        "Insufficient position: have " + formatQty(have)
                                + ", tried to sell " + formatQty(quantity)));
            }
        } else {
            double available = CASH_LEDGER.getOrDefault(accountId, 0.0);
            if (available < total) {
                return PlaceOrderResult.ok(recordRejected(accountId, ticker, side, quantity, price,
                        "Insufficient cash: have $" + round2(available)
                                + ", need $" + total));
            }
        }

        OrderJTO order = new OrderJTO();
        order.setId("ord_" + (nextOrderId++));
        order.setAccountId(accountId);
        order.setTicker(symbol.getTicker());
        order.setSide(side);
        order.setQuantity(quantity);
        order.setFillPrice(price);
        order.setTotal(total);
        order.setStatus("filled");
        order.setRejectionReason(null);
        order.setPlacedAt(Instant.now().toString());
        ORDERS.add(0, order);
        applyToPosition(order);
        applyToCash(order);
        return PlaceOrderResult.ok(order);
    }

    public static PortfolioSummaryJTO getPortfolio(String accountId) {
        ensureAccount(accountId);
        List<PositionJTO> positions = listPositions(accountId);

        double marketValue = 0;
        double costBasis = 0;
        for (PositionJTO p : positions) {
            marketValue += p.getMarketValue();
            costBasis += p.getAverageCost() * p.getQuantity();
        }
        marketValue = round2(marketValue);
        costBasis = round2(costBasis);
        double pnl = round2(marketValue - costBasis);
        double pnlPercent = costBasis == 0 ? 0 : round2((pnl / costBasis) * 100);
        double cash = round2(CASH_LEDGER.getOrDefault(accountId, 0.0));
        double equity = round2(marketValue + cash);

        PositionJTO top = null;
        for (PositionJTO p : positions) {
            if (top == null || p.getMarketValue() > top.getMarketValue()) top = p;
        }

        PortfolioSummaryJTO s = new PortfolioSummaryJTO();
        s.setAccountId(accountId);
        s.setCashAvailable(cash);
        s.setTotalMarketValue(marketValue);
        s.setTotalCostBasis(costBasis);
        s.setTotalUnrealizedPnL(pnl);
        s.setTotalUnrealizedPnLPercent(pnlPercent);
        s.setTotalEquity(equity);
        s.setPositionsCount(positions.size());
        s.setTopHoldingTicker(top == null ? null : top.getTicker());
        return s;
    }

    // ----- internals ----------------------------------------------------------

    private static double ensureAccount(String accountId) {
        Double current = CASH_LEDGER.get(accountId);
        if (current != null) return current;
        CASH_LEDGER.put(accountId, INITIAL_CASH_USD);
        return INITIAL_CASH_USD;
    }

    private static SymbolJTO findSymbol(String ticker) {
        for (SymbolJTO s : SYMBOLS) if (s.getTicker().equals(ticker)) return s;
        return null;
    }

    private static StoredPosition findPosition(String accountId, String ticker) {
        for (StoredPosition p : POSITIONS) {
            if (p.accountId.equals(accountId) && p.ticker.equals(ticker)) return p;
        }
        return null;
    }

    private static PositionJTO hydrate(StoredPosition p) {
        SymbolJTO symbol = findSymbol(p.ticker);
        double lastPrice = symbol == null ? p.averageCost : symbol.getLastPrice();
        String name = symbol == null ? p.ticker : symbol.getName();
        double marketValue = round2(p.quantity * lastPrice);
        double costBasis = p.averageCost * p.quantity;
        double pnl = round2(marketValue - costBasis);
        double pnlPercent = costBasis == 0 ? 0 : round2((pnl / costBasis) * 100);

        PositionJTO jto = new PositionJTO();
        jto.setAccountId(p.accountId);
        jto.setTicker(p.ticker);
        jto.setName(name);
        jto.setQuantity(p.quantity);
        jto.setAverageCost(round2(p.averageCost));
        jto.setMarketValue(marketValue);
        jto.setUnrealizedPnL(pnl);
        jto.setUnrealizedPnLPercent(pnlPercent);
        return jto;
    }

    private static void applyToPosition(OrderJTO order) {
        int idx = -1;
        for (int i = 0; i < POSITIONS.size(); i++) {
            StoredPosition p = POSITIONS.get(i);
            if (p.accountId.equals(order.getAccountId()) && p.ticker.equals(order.getTicker())) {
                idx = i; break;
            }
        }

        if ("buy".equals(order.getSide())) {
            if (idx == -1) {
                POSITIONS.add(new StoredPosition(order.getAccountId(), order.getTicker(),
                        order.getQuantity(), order.getFillPrice()));
                return;
            }
            StoredPosition existing = POSITIONS.get(idx);
            double newQty = existing.quantity + order.getQuantity();
            double newCost = (existing.quantity * existing.averageCost
                    + order.getQuantity() * order.getFillPrice()) / newQty;
            POSITIONS.set(idx, new StoredPosition(
                    existing.accountId, existing.ticker, newQty, newCost));
            return;
        }

        // sell
        if (idx == -1) return;
        StoredPosition existing = POSITIONS.get(idx);
        double remaining = existing.quantity - order.getQuantity();
        if (remaining <= 0) {
            POSITIONS.remove(idx);
            return;
        }
        POSITIONS.set(idx, new StoredPosition(
                existing.accountId, existing.ticker, remaining, existing.averageCost));
    }

    private static void applyToCash(OrderJTO order) {
        double current = CASH_LEDGER.getOrDefault(order.getAccountId(), 0.0);
        double next = "buy".equals(order.getSide())
                ? current - order.getTotal()
                : current + order.getTotal();
        CASH_LEDGER.put(order.getAccountId(), round2(next));
    }

    private static OrderJTO recordRejected(String accountId, String ticker, String side,
                                           double quantity, double price, String reason) {
        OrderJTO o = new OrderJTO();
        o.setId("ord_" + (nextOrderId++));
        o.setAccountId(accountId);
        o.setTicker(ticker);
        o.setSide(side);
        o.setQuantity(quantity);
        o.setFillPrice(price);
        o.setTotal(round2(price * quantity));
        o.setStatus("rejected");
        o.setRejectionReason(reason);
        o.setPlacedAt(Instant.now().toString());
        ORDERS.add(0, o);
        return o;
    }

    private static double round2(double n) {
        return Math.round(n * 100.0) / 100.0;
    }

    private static String formatQty(double q) {
        if (q == Math.floor(q)) return String.valueOf((long) q);
        return String.valueOf(q);
    }

    // ----- seed ---------------------------------------------------------------

    private static String iso(int daysAgo) {
        return Instant.now().minus(daysAgo, ChronoUnit.DAYS).toString();
    }

    private static void seedSymbols() {
        SYMBOLS.add(symbol("AAPL",  "Apple Inc.",       "Technology",     187.42,  1.23));
        SYMBOLS.add(symbol("MSFT",  "Microsoft Corp.",  "Technology",     412.15, -0.84));
        SYMBOLS.add(symbol("NVDA",  "NVIDIA Corp.",     "Semiconductors", 945.6,   3.91));
        SYMBOLS.add(symbol("GOOGL", "Alphabet Inc.",    "Technology",     164.22,  0.45));
        SYMBOLS.add(symbol("AMZN",  "Amazon.com Inc.",  "Consumer",       178.55, -1.12));
        SYMBOLS.add(symbol("TSLA",  "Tesla Inc.",       "Automotive",     248.17,  2.67));
        SYMBOLS.add(symbol("META",  "Meta Platforms",   "Technology",     512.4,  -0.28));
        SYMBOLS.add(symbol("JPM",   "JPMorgan Chase",   "Financials",     205.8,   0.18));
    }

    private static void seedPositions() {
        POSITIONS.add(new StoredPosition("acc_verified_1", "AAPL", 42, 170.25));
        POSITIONS.add(new StoredPosition("acc_verified_1", "NVDA", 6,  620.1));
        POSITIONS.add(new StoredPosition("acc_verified_1", "JPM",  25, 198.55));
    }

    private static void seedOrders() {
        ORDERS.add(order("ord_3001", "acc_verified_1", "AAPL", "buy", 10, 170.25, 1702.5,  iso(18)));
        ORDERS.add(order("ord_3002", "acc_verified_1", "NVDA", "buy", 6,  620.1,  3720.6,  iso(12)));
        ORDERS.add(order("ord_3003", "acc_verified_1", "AAPL", "buy", 32, 170.25, 5448.0,  iso(6)));
    }

    private static void seedCashLedger() {
        for (String id : SEEDED_ACCOUNT_IDS) {
            CASH_LEDGER.put(id, INITIAL_CASH_USD);
        }
        String primary = "acc_verified_1";
        double seedCost = 0;
        for (StoredPosition p : POSITIONS) {
            if (p.accountId.equals(primary)) seedCost += p.quantity * p.averageCost;
        }
        CASH_LEDGER.put(primary, round2(INITIAL_CASH_USD - seedCost));
    }

    private static SymbolJTO symbol(String ticker, String name, String sector,
                                    double lastPrice, double change24h) {
        SymbolJTO s = new SymbolJTO();
        s.setTicker(ticker);
        s.setName(name);
        s.setSector(sector);
        s.setLastPrice(lastPrice);
        s.setChange24h(change24h);
        return s;
    }

    private static OrderJTO order(String id, String accountId, String ticker, String side,
                                  double quantity, double fillPrice, double total, String placedAt) {
        OrderJTO o = new OrderJTO();
        o.setId(id);
        o.setAccountId(accountId);
        o.setTicker(ticker);
        o.setSide(side);
        o.setQuantity(quantity);
        o.setFillPrice(fillPrice);
        o.setTotal(total);
        o.setStatus("filled");
        o.setRejectionReason(null);
        o.setPlacedAt(placedAt);
        return o;
    }

    // ----- helpers ------------------------------------------------------------

    private static final class StoredPosition {
        final String accountId;
        final String ticker;
        final double quantity;
        final double averageCost;

        StoredPosition(String accountId, String ticker, double quantity, double averageCost) {
            this.accountId = accountId;
            this.ticker = ticker;
            this.quantity = quantity;
            this.averageCost = averageCost;
        }
    }

    public static final class PlaceOrderResult {
        public final OrderJTO order;
        public final boolean symbolNotFound;

        private PlaceOrderResult(OrderJTO order, boolean symbolNotFound) {
            this.order = order;
            this.symbolNotFound = symbolNotFound;
        }
        static PlaceOrderResult ok(OrderJTO o) { return new PlaceOrderResult(o, false); }
        static PlaceOrderResult symbolNotFound() { return new PlaceOrderResult(null, true); }
    }
}
