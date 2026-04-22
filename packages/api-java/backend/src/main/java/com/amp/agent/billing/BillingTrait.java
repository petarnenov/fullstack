package com.amp.agent.billing;

import atomatron.worker.agent.message.Message;
import com.amp.agent.GeowealthBasicManagerTrait;
import com.amp.service.Response;
import com.amp.service.billing.GetInvoiceMsg;
import com.amp.service.billing.GetSummaryMsg;
import com.amp.service.billing.ListInvoicesMsg;
import com.amp.service.billing.ListTransactionsMsg;
import com.amp.service.billing.PayInvoiceMsg;
import com.netfolio.agent.RetryReaction;

public class BillingTrait extends GeowealthBasicManagerTrait {
    private static final long serialVersionUID = 1L;

    @Override
    public void prepareReactions() {
        when(ListInvoicesMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                ListInvoicesMsg msg = (ListInvoicesMsg) aMessage;
                try {
                    msg.setInvoices(BillingProcess.listInvoices());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(GetInvoiceMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                GetInvoiceMsg msg = (GetInvoiceMsg) aMessage;
                try {
                    msg.setInvoice(BillingProcess.getInvoice(msg.getId()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(PayInvoiceMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                PayInvoiceMsg msg = (PayInvoiceMsg) aMessage;
                try {
                    msg.setInvoice(BillingProcess.payInvoice(msg.getId(), msg.getPaymentMethodId()));
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(ListTransactionsMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                ListTransactionsMsg msg = (ListTransactionsMsg) aMessage;
                try {
                    msg.setTransactions(BillingProcess.listTransactions());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });

        when(GetSummaryMsg.class, new RetryReaction() {
            @Override
            public void react(Message aMessage) throws Throwable {
                GetSummaryMsg msg = (GetSummaryMsg) aMessage;
                try {
                    msg.setSummary(BillingProcess.getSummary());
                    msg.setResponse(new Response());
                } catch (Exception ex) {
                    logAndThrow(ex, msg);
                }
            }
        });
    }
}
