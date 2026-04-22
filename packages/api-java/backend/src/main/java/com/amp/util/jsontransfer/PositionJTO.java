package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PositionJTO extends AbstractJTO {
    private String accountId;
    private String ticker;
    private String name;
    private double quantity;
    private double averageCost;
    private double marketValue;
    private double unrealizedPnL;
    private double unrealizedPnLPercent;
}
