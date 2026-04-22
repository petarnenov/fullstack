package com.amp.bff.reporting.client;

import com.amp.bff.reporting.model.MonolithTypes.Account;
import com.amp.bff.reporting.model.MonolithTypes.Invoice;
import com.amp.bff.reporting.model.MonolithTypes.PortfolioSummary;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * All outbound HTTP from the BFF to the monolith. Since Phase 1 of the
 * production-auth cut-over, the session is carried in httpOnly cookies —
 * the browser attaches {@code amp_access_token} to every call to the BFF,
 * and we forward the whole Cookie header verbatim so the monolith's
 * {@code AuthenticatedJsonAction} sees the same session it would have seen
 * if the MFE had called it directly. The BFF still does no token validation
 * of its own (see CLAUDE.md constraint #6).
 */
@Component
public class MonolithClient {

    private final WebClient client;

    public MonolithClient(
        WebClient.Builder builder,
        @Value("${amp.monolith.base-url}") String baseUrl
    ) {
        this.client = builder.baseUrl(baseUrl).build();
    }

    public Mono<List<Account>> listAccounts(String cookieHeader) {
        return client.get()
            .uri("/api/accounts")
            .headers(h -> forwardCookie(h, cookieHeader))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Account>>() {});
    }

    public Mono<List<Invoice>> listInvoices(String cookieHeader) {
        return client.get()
            .uri("/api/billing/invoices")
            .headers(h -> forwardCookie(h, cookieHeader))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Invoice>>() {});
    }

    public Mono<PortfolioSummary> getPortfolio(String accountId, String cookieHeader) {
        return client.get()
            .uri(uri -> uri.path("/api/trading/portfolio")
                .queryParam("accountId", accountId)
                .build())
            .headers(h -> forwardCookie(h, cookieHeader))
            .retrieve()
            .bodyToMono(PortfolioSummary.class);
    }

    private static void forwardCookie(HttpHeaders headers, String cookieHeader) {
        if (cookieHeader != null && !cookieHeader.isBlank()) {
            headers.set(HttpHeaders.COOKIE, cookieHeader);
        }
    }
}
