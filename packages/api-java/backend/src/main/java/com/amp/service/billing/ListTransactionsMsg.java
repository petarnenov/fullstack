package com.amp.service.billing;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.TransactionJTO;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ListTransactionsMsg extends Message {
    private static final long serialVersionUID = 1L;

    private Response response;
    private List<TransactionJTO> transactions;
}
