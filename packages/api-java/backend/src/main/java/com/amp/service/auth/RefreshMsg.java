package com.amp.service.auth;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefreshMsg extends Message {
    private static final long serialVersionUID = 1L;

    /** The refresh cookie value presented by the browser. */
    private final String refreshToken;
    private Response response;
    /** Null when the refresh token is unknown, revoked or expired. */
    private IssuedSession result;

    public RefreshMsg(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}
