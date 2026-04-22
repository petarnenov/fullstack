package com.amp.service.trading;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.OrderJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PlaceOrderMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String accountId;
    private final String ticker;
    private final String side;
    private final double quantity;

    private Response response;
    private OrderJTO order;
    private boolean symbolNotFound;

    public PlaceOrderMsg(String accountId, String ticker, String side, double quantity) {
        this.accountId = accountId;
        this.ticker = ticker;
        this.side = side;
        this.quantity = quantity;
    }
}
