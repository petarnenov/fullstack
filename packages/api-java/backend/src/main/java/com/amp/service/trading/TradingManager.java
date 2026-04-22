package com.amp.service.trading;

import atomatron.worker.service.Service;
import com.amp.util.jsontransfer.CashBalanceJTO;
import com.amp.util.jsontransfer.OrderJTO;
import com.amp.util.jsontransfer.PortfolioSummaryJTO;
import com.amp.util.jsontransfer.PositionJTO;
import com.amp.util.jsontransfer.SymbolJTO;
import com.amp.util.jsontransfer.TradingAccountViewJTO;
import lombok.Getter;

import java.util.List;

public class TradingManager extends Service {
    @Getter
    private static final TradingManager sole = new TradingManager("TradingManager");

    private TradingManager(String name) {
        super(name);
    }

    public List<SymbolJTO> listSymbols() {
        ListSymbolsMsg msg = new ListSymbolsMsg();
        msg = (ListSymbolsMsg) providerSendAndWait(msg);
        return msg.getSymbols();
    }

    public List<TradingAccountViewJTO> listTradingAccounts() {
        ListTradingAccountsMsg msg = new ListTradingAccountsMsg();
        msg = (ListTradingAccountsMsg) providerSendAndWait(msg);
        return msg.getAccounts();
    }

    public CashBalanceJTO getCash(String accountId) {
        GetCashMsg msg = new GetCashMsg(accountId);
        msg = (GetCashMsg) providerSendAndWait(msg);
        return msg.getBalance();
    }

    public CashBalanceJTO deposit(String accountId, double amount) {
        DepositMsg msg = new DepositMsg(accountId, amount);
        msg = (DepositMsg) providerSendAndWait(msg);
        return msg.getBalance();
    }

    public List<PositionJTO> listPositions(String accountId) {
        ListPositionsMsg msg = new ListPositionsMsg(accountId);
        msg = (ListPositionsMsg) providerSendAndWait(msg);
        return msg.getPositions();
    }

    public List<OrderJTO> listOrders(String accountId) {
        ListOrdersMsg msg = new ListOrdersMsg(accountId);
        msg = (ListOrdersMsg) providerSendAndWait(msg);
        return msg.getOrders();
    }

    public PlaceOrderMsg placeOrder(String accountId, String ticker, String side, double quantity) {
        PlaceOrderMsg msg = new PlaceOrderMsg(accountId, ticker, side, quantity);
        msg = (PlaceOrderMsg) providerSendAndWait(msg);
        return msg;
    }

    public PortfolioSummaryJTO getPortfolio(String accountId) {
        GetPortfolioMsg msg = new GetPortfolioMsg(accountId);
        msg = (GetPortfolioMsg) providerSendAndWait(msg);
        return msg.getPortfolio();
    }
}
