package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransactionJTO extends AbstractJTO {
    private String id;
    private String invoiceId;
    private String accountId;
    private double amount;
    private String currency;
    private String type;
    private String description;
    private String timestamp;
}
