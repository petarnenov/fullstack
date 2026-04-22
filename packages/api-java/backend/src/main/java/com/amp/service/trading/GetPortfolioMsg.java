package com.amp.service.trading;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.PortfolioSummaryJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetPortfolioMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String accountId;
    private Response response;
    private PortfolioSummaryJTO portfolio;

    public GetPortfolioMsg(String accountId) {
        this.accountId = accountId;
    }
}
