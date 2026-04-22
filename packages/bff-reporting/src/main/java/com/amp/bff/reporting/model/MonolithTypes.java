package com.amp.bff.reporting.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * Partial shapes of monolith responses — the BFF only deserialises the fields
 * it actually reshapes. @JsonIgnoreProperties(ignoreUnknown = true) is applied
 * globally so adding new fields upstream never breaks deserialisation here.
 */
public final class MonolithTypes {

    private MonolithTypes() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Account(
        String id,
        String holderName,
        String productType,
        String status,
        List<String> completedSteps
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Invoice(
        String id,
        String accountId,
        double amount,
        String currency,
        String status
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PortfolioSummary(
        String accountId,
        double cashAvailable,
        double totalMarketValue,
        double totalUnrealizedPnL,
        double totalEquity,
        int positionsCount,
        String topHoldingTicker
    ) {}
}
