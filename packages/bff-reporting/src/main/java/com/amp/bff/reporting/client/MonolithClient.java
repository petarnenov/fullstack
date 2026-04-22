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
 * All outbound HTTP from the BFF to the monolith. The Authorization header
 * received from the browser is forwarded verbatim so the monolith performs the
 * actual token check — the BFF intentionally does not re-validate tokens, to
 * avoid duplicating auth logic (see CLAUDE.md constraint #6).
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

    public Mono<List<Account>> listAccounts(String authHeader) {
        return client.get()
            .uri("/api/accounts")
            .headers(h -> forwardAuth(h, authHeader))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Account>>() {});
    }

    public Mono<List<Invoice>> listInvoices(String authHeader) {
        return client.get()
            .uri("/api/billing/invoices")
            .headers(h -> forwardAuth(h, authHeader))
            .retrieve()
            .bodyToMono(new ParameterizedTypeReference<List<Invoice>>() {});
    }

    public Mono<PortfolioSummary> getPortfolio(String accountId, String authHeader) {
        return client.get()
            .uri(uri -> uri.path("/api/trading/portfolio")
                .queryParam("accountId", accountId)
                .build())
            .headers(h -> forwardAuth(h, authHeader))
            .retrieve()
            .bodyToMono(PortfolioSummary.class);
    }

    private static void forwardAuth(HttpHeaders headers, String authHeader) {
        if (authHeader != null && !authHeader.isBlank()) {
            headers.set(HttpHeaders.AUTHORIZATION, authHeader);
        }
    }
}
