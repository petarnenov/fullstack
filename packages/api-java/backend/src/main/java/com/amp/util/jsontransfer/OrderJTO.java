package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderJTO extends AbstractJTO {
    private String id;
    private String accountId;
    private String ticker;
    private String side;
    private double quantity;
    private double fillPrice;
    private double total;
    private String status;
    private String rejectionReason;
    private String placedAt;
}
