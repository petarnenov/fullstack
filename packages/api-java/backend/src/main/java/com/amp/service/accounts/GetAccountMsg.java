package com.amp.service.accounts;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.AccountJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GetAccountMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String id;
    private Response response;
    private AccountJTO account;

    public GetAccountMsg(String id) {
        this.id = id;
    }
}
