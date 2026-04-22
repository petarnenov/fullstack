package com.amp.agent.billing;

import com.amp.util.jsontransfer.BillingSummaryJTO;
import com.amp.util.jsontransfer.InvoiceJTO;
import com.amp.util.jsontransfer.TransactionJTO;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;

/**
 * In-memory billing state, serialized through the single BillingManager agent.
 * Mirrors packages/api/src/domains/billing/billing.repository.ts (no persistence —
 * data resets on every Tomcat restart, matching the Node tier's contract).
 */
public class BillingProcess {
    private static final String CURRENCY = "USD";

    private static final List<InvoiceJTO> INVOICES = new ArrayList<>();
    private static final List<TransactionJTO> TRANSACTIONS = new ArrayList<>();
    private static int nextInvoiceTxn = 2003;

    static {
        seedInvoices();
        seedTransactions();
    }

    private BillingProcess() {}

    public static List<InvoiceJTO> listInvoices() {
        List<InvoiceJTO> out = new ArrayList<>(INVOICES);
        out.sort(Comparator.comparing(InvoiceJTO::getIssuedAt).reversed());
        return out;
    }

    public static InvoiceJTO getInvoice(String id) {
        for (InvoiceJTO i : INVOICES) {
            if (i.getId().equals(id)) return i;
        }
        return null;
    }

    public static InvoiceJTO payInvoice(String id, String paymentMethodId) {
        InvoiceJTO invoice = getInvoice(id);
        if (invoice == null) return null;
        if ("paid".equals(invoice.getStatus())) return invoice;

        String paidAt = Instant.now().toString();
        invoice.setStatus("paid");
        invoice.setPaidAt(paidAt);

        TransactionJTO txn = new TransactionJTO();
        txn.setId("txn_" + (nextInvoiceTxn++));
        txn.setInvoiceId(invoice.getId());
        txn.setAccountId(invoice.getAccountId());
        txn.setAmount(invoice.getAmount());
        txn.setCurrency(invoice.getCurrency());
        txn.setType("charge");
        txn.setDescription("Payment for invoice " + invoice.getId() + " via " + paymentMethodId);
        txn.setTimestamp(paidAt);
        TRANSACTIONS.add(0, txn);

        return invoice;
    }

    public static List<TransactionJTO> listTransactions() {
        List<TransactionJTO> out = new ArrayList<>(TRANSACTIONS);
        out.sort(Comparator.comparing(TransactionJTO::getTimestamp).reversed());
        return out;
    }

    public static BillingSummaryJTO getSummary() {
        String thisMonth = Instant.now().atOffset(ZoneOffset.UTC)
                .format(DateTimeFormatter.ofPattern("yyyy-MM"));

        double outstanding = 0;
        int overdue = 0;
        int pending = 0;
        double paidThisMonth = 0;

        for (InvoiceJTO inv : INVOICES) {
            if ("overdue".equals(inv.getStatus())) {
                overdue++;
                outstanding += inv.getAmount();
            } else if ("pending".equals(inv.getStatus())) {
                pending++;
                outstanding += inv.getAmount();
            } else if ("paid".equals(inv.getStatus())
                    && inv.getPaidAt() != null
                    && inv.getPaidAt().startsWith(thisMonth)) {
                paidThisMonth += inv.getAmount();
            }
        }

        BillingSummaryJTO s = new BillingSummaryJTO();
        s.setOutstandingBalance(round2(outstanding));
        s.setCurrency(CURRENCY);
        s.setOverdueCount(overdue);
        s.setPendingCount(pending);
        s.setPaidThisMonth(round2(paidThisMonth));
        return s;
    }

    // ----- seed ---------------------------------------------------------------

    private static String iso(int daysFromNow) {
        return Instant.now().plus(daysFromNow, ChronoUnit.DAYS).toString();
    }

    private static void seedInvoices() {
        INVOICES.add(invoice("inv_1001", "acc_verified_1", 1250.0, "overdue",
                "Custody fee – March 2026", iso(-45), iso(-15), null));
        INVOICES.add(invoice("inv_1002", "acc_verified_1", 420.5, "pending",
                "Trading commissions – April 2026", iso(-10), iso(5), null));
        INVOICES.add(invoice("inv_1003", "acc_verified_2", 89.99, "pending",
                "Market data subscription – April 2026", iso(-7), iso(14), null));
        INVOICES.add(invoice("inv_1004", "acc_verified_1", 750.0, "paid",
                "Advisory services – Q1 2026", iso(-40), iso(-10), iso(-12)));
    }

    private static void seedTransactions() {
        TRANSACTIONS.add(transaction("txn_2001", "inv_1004", "acc_verified_1",
                750.0, "charge", "Payment for invoice inv_1004", iso(-12)));
        TRANSACTIONS.add(transaction("txn_2002", "inv_1004", "acc_verified_1",
                5.0, "fee", "Processing fee", iso(-12)));
    }

    private static InvoiceJTO invoice(String id, String accountId, double amount,
                                      String status, String description,
                                      String issuedAt, String dueAt, String paidAt) {
        InvoiceJTO i = new InvoiceJTO();
        i.setId(id);
        i.setAccountId(accountId);
        i.setAmount(amount);
        i.setCurrency(CURRENCY);
        i.setStatus(status);
        i.setDescription(description);
        i.setIssuedAt(issuedAt);
        i.setDueAt(dueAt);
        i.setPaidAt(paidAt);
        return i;
    }

    private static TransactionJTO transaction(String id, String invoiceId, String accountId,
                                              double amount, String type,
                                              String description, String timestamp) {
        TransactionJTO t = new TransactionJTO();
        t.setId(id);
        t.setInvoiceId(invoiceId);
        t.setAccountId(accountId);
        t.setAmount(amount);
        t.setCurrency(CURRENCY);
        t.setType(type);
        t.setDescription(description);
        t.setTimestamp(timestamp);
        return t;
    }

    private static double round2(double n) {
        return Math.round(n * 100.0) / 100.0;
    }
}
