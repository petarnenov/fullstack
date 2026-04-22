package com.amp.service.trading;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.OrderJTO;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ListOrdersMsg extends Message {
    private static final long serialVersionUID = 1L;

    /** Nullable — when null the manager returns orders for all accounts. */
    private final String accountId;
    private Response response;
    private List<OrderJTO> orders;

    public ListOrdersMsg(String accountId) {
        this.accountId = accountId;
    }
}
