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

    /** Access cookie value. */
    private final String accessToken;
    private Response response;
    private AuthenticatedUserJTO user;
    private String csrfToken;

    public MeMsg(String accessToken) {
        this.accessToken = accessToken;
    }
}
