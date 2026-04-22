package com.amp.service.auth;

import atomatron.worker.agent.message.Message;
import com.amp.service.Response;
import com.amp.util.jsontransfer.LoginResponseJTO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginMsg extends Message {
    private static final long serialVersionUID = 1L;

    private final String email;
    private final String password;
    private Response response;
    private LoginResponseJTO result;
    private boolean invalidCredentials;

    public LoginMsg(String email, String password) {
        this.email = email;
        this.password = password;
    }
}
