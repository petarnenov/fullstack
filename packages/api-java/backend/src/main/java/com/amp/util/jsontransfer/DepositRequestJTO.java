package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DepositRequestJTO {
    private String accountId;
    private double amount;
}
