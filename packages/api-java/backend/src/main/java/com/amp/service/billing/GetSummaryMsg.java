package com.amp.service.billing;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.BillingSummaryJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetSummaryMsg extends Message {
    private static final long serialVersionUID = 1L;

    private Response response;
    private BillingSummaryJTO summary;
}
