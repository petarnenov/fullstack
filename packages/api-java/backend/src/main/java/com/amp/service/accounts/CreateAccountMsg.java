package com.amp.service.accounts;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.AccountJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateAccountMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String holderName;
    private final String email;
    private final String productType;
    private Response response;
    private AccountJTO account;

    public CreateAccountMsg(String holderName, String email, String productType) {
        this.holderName = holderName;
        this.email = email;
        this.productType = productType;
    }
}
