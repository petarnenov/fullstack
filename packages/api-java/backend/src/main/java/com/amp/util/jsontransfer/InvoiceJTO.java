package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class InvoiceJTO extends AbstractJTO {
    private String id;
    private String accountId;
    private double amount;
    private String currency;
    private String status;
    private String description;
    private String issuedAt;
    private String dueAt;
    private String paidAt;
}
