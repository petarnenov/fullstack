package com.amp.service.auth;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MeMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String token;
    private Response response;
    private AuthenticatedUserJTO user;

    public MeMsg(String token) {
        this.token = token;
    }
}
