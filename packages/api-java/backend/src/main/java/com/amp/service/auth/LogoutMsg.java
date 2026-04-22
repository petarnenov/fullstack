package com.amp.service.auth;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LogoutMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String token;
    private Response response;

    public LogoutMsg(String token) {
        this.token = token;
    }
}
