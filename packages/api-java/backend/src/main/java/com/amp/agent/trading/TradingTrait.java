package com.amp.agent.trading;

import atomatron.worker.agent.message.Message;
import com.amp.agent.GeowealthBasicManagerTrait;
import com.amp.service.Response;
import com.amp.service.trading.DepositMsg;
import com.amp.service.trading.GetCashMsg;
import com.amp.service.trading.GetPortfolioMsg;
import com.amp.service.trading.ListOrdersMsg;
import com.amp.service.trading.ListPositionsMsg;
import com.amp.service.trading.ListSymbolsMsg;
import com.amp.service.trading.ListTradingAccountsMsg;
import com.amp.service.trading.PlaceOrderMsg;
import com.netfolio.agent.RetryReaction;

public class TradingTrait extends GeowealthBasicManagerTrait {
    private static final long serialVersionUID = 1L;

    @Override
    public void prepareReactions() {
        when(ListSymbolsMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                ListSymbolsMsg msg = (ListSymbolsMsg) aMessage;
                try {
                    msg.setSymbols(TradingProcess.listSymbols());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(ListTradingAccountsMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                ListTradingAccountsMsg msg = (ListTradingAccountsMsg) aMessage;
                try {
                    msg.setAccounts(TradingProcess.listTradingAccounts());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(GetCashMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                GetCashMsg msg = (GetCashMsg) aMessage;
                try {
                    msg.setBalance(TradingProcess.getCash(msg.getAccountId()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(DepositMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                DepositMsg msg = (DepositMsg) aMessage;
                try {
                    msg.setBalance(TradingProcess.deposit(msg.getAccountId(), msg.getAmount()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(ListPositionsMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                ListPositionsMsg msg = (ListPositionsMsg) aMessage;
                try {
                    msg.setPositions(TradingProcess.listPositions(msg.getAccountId()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(ListOrdersMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                ListOrdersMsg msg = (ListOrdersMsg) aMessage;
                try {
                    msg.setOrders(TradingProcess.listOrders(msg.getAccountId()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(PlaceOrderMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                PlaceOrderMsg msg = (PlaceOrderMsg) aMessage;
                try {
                    TradingProcess.PlaceOrderResult r = TradingProcess.placeOrder(
                            msg.getAccountId(), msg.getTicker(), msg.getSide(), msg.getQuantity());
                    msg.setOrder(r.order);
                    msg.setSymbolNotFound(r.symbolNotFound);
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(GetPortfolioMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                GetPortfolioMsg msg = (GetPortfolioMsg) aMessage;
                try {
                    msg.setPortfolio(TradingProcess.getPortfolio(msg.getAccountId()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });
    }
}
