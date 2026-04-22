package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CashBalanceJTO extends AbstractJTO {
    private String accountId;
    private double cashAvailable;
    private String currency;
}
