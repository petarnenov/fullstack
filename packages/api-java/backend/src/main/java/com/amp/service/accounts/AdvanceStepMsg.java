package com.amp.service.accounts;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.AccountJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdvanceStepMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String id;
    private final String step;
    private Response response;
    private AccountJTO account;
    private boolean notFound;
    private String invalidStepReason;

    public AdvanceStepMsg(String id, String step) {
        this.id = id;
        this.step = step;
    }
}
