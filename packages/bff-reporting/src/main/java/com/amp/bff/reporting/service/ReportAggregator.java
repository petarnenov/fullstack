package com.amp.bff.reporting.service;

import com.amp.bff.reporting.client.MonolithClient;
import com.amp.bff.reporting.model.AccountReport;
import com.amp.bff.reporting.model.MonolithTypes.Account;
import com.amp.bff.reporting.model.MonolithTypes.Invoice;
import com.amp.bff.reporting.model.MonolithTypes.PortfolioSummary;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Cross-domain fan-out. The MFE hits one BFF endpoint; the BFF hits three
 * monolith endpoints (accounts, invoices, portfolio-per-account) in parallel
 * and reshapes the result into AccountReport[]. Without the BFF the MFE would
 * need 2 + N round trips (plus client-side join) to build the same view.
 */
@Service
public class ReportAggregator {

    private final MonolithClient monolith;

    public ReportAggregator(MonolithClient monolith) {
        this.monolith = monolith;
    }

    public Mono<List<AccountReport>> summarise(String cookieHeader) {
        Mono<List<Account>> accounts = monolith.listAccounts(cookieHeader);
        Mono<List<Invoice>> invoices = monolith.listInvoices(cookieHeader);

        return Mono.zip(accounts, invoices)
            .flatMap(tuple -> {
                List<Account> acc = tuple.getT1();
                Map<String, List<Invoice>> invoicesByAccount = tuple.getT2().stream()
                    .collect(Collectors.groupingBy(Invoice::accountId));

                return Flux.fromIterable(acc)
                    .flatMap(a -> monolith.getPortfolio(a.id(), cookieHeader)
                        // If trading doesn't know this account yet, fall back to
                        // an empty portfolio rather than failing the whole report.
                        .onErrorReturn(emptyPortfolio(a.id()))
                        .map(p -> buildReport(a, invoicesByAccount.getOrDefault(a.id(), List.of()), p)))
                    .collectList();
            });
    }

    private static AccountReport buildReport(Account account, List<Invoice> invoices, PortfolioSummary portfolio) {
        double outstanding = invoices.stream()
            .filter(i -> !"paid".equalsIgnoreCase(i.status()))
            .mapToDouble(Invoice::amount)
            .sum();
        int outstandingCount = (int) invoices.stream()
            .filter(i -> !"paid".equalsIgnoreCase(i.status()))
            .count();
        int overdueCount = (int) invoices.stream()
            .filter(i -> "overdue".equalsIgnoreCase(i.status()))
            .count();

        return new AccountReport(
            account.id(),
            account.holderName(),
            account.productType(),
            account.status(),
            outstanding,
            outstandingCount,
            overdueCount,
            portfolio.cashAvailable(),
            portfolio.totalEquity(),
            portfolio.totalUnrealizedPnL(),
            portfolio.positionsCount(),
            portfolio.topHoldingTicker()
        );
    }

    private static PortfolioSummary emptyPortfolio(String accountId) {
        return new PortfolioSummary(accountId, 0, 0, 0, 0, 0, null);
    }
}
