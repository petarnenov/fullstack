package com.amp.service.billing;

import atomatron.worker.service.Service;
import com.amp.util.jsontransfer.BillingSummaryJTO;
import com.amp.util.jsontransfer.InvoiceJTO;
import com.amp.util.jsontransfer.TransactionJTO;
import lombok.Getter;

import java.util.List;

public class BillingManager extends Service {
    @Getter
    private static final BillingManager sole = new BillingManager("BillingManager");

    private BillingManager(String name) {
        super(name);
    }

    public List<InvoiceJTO> listInvoices() {
        ListInvoicesMsg msg = new ListInvoicesMsg();
        msg = (ListInvoicesMsg) providerSendAndWait(msg);
        return msg.getInvoices();
    }

    public InvoiceJTO getInvoice(String id) {
        GetInvoiceMsg msg = new GetInvoiceMsg(id);
        msg = (GetInvoiceMsg) providerSendAndWait(msg);
        return msg.getInvoice();
    }

    public InvoiceJTO payInvoice(String id, String paymentMethodId) {
        PayInvoiceMsg msg = new PayInvoiceMsg(id, paymentMethodId);
        msg = (PayInvoiceMsg) providerSendAndWait(msg);
        return msg.getInvoice();
    }

    public List<TransactionJTO> listTransactions() {
        ListTransactionsMsg msg = new ListTransactionsMsg();
        msg = (ListTransactionsMsg) providerSendAndWait(msg);
        return msg.getTransactions();
    }

    public BillingSummaryJTO getSummary() {
        GetSummaryMsg msg = new GetSummaryMsg();
        msg = (GetSummaryMsg) providerSendAndWait(msg);
        return msg.getSummary();
    }
}
