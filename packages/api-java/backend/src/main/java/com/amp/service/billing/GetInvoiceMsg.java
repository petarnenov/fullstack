package com.amp.service.billing;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.InvoiceJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetInvoiceMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String id;
    private Response response;
    private InvoiceJTO invoice;

    public GetInvoiceMsg(String id) {
        this.id = id;
    }
}
