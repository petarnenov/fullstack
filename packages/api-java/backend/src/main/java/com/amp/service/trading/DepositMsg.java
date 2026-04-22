package com.amp.service.trading;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.CashBalanceJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DepositMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String accountId;
    private final double amount;
    private Response response;
    private CashBalanceJTO balance;

    public DepositMsg(String accountId, double amount) {
        this.accountId = accountId;
        this.amount = amount;
    }
}
