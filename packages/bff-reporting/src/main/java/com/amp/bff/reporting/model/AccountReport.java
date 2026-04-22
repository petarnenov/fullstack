package com.amp.bff.reporting.model;

/**
 * Cross-domain summary per account — the shape the Reporting MFE renders.
 * This DTO is BFF-owned and has no counterpart in the monolith's OpenAPI.
 * Wiring changes upstream don't force the MFE to change: the BFF absorbs them.
 */
public record AccountReport(
    String accountId,
    String holderName,
    String productType,
    String status,
    // billing slice
    double outstandingAmount,
    int outstandingInvoiceCount,
    int overdueInvoiceCount,
    // trading slice
    double cashAvailable,
    double totalEquity,
    double totalUnrealizedPnL,
    int positionsCount,
    String topHoldingTicker
) {}
