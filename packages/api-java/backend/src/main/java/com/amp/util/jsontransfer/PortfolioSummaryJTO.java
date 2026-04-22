package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PortfolioSummaryJTO extends AbstractJTO {
    private String accountId;
    private double cashAvailable;
    private double totalMarketValue;
    private double totalCostBasis;
    private double totalUnrealizedPnL;
    private double totalUnrealizedPnLPercent;
    private double totalEquity;
    private int positionsCount;
    private String topHoldingTicker;
}
