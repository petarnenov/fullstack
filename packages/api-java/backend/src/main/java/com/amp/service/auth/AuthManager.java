package com.amp.service.auth;

import atomatron.worker.service.Service;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.util.jsontransfer.DemoCredentialJTO;
import com.amp.util.jsontransfer.LoginResponseJTO;
import lombok.Getter;

import java.util.List;

public class AuthManager extends Service {
    @Getter
    private static final AuthManager sole = new AuthManager("AuthManager");

    private AuthManager(String name) {
        super(name);
    }

    /**
     * @return {@link LoginResponseJTO} when credentials are valid, {@code null} when invalid.
     * A null return (vs throwing) lets the caller distinguish 401 from 500.
     */
    public LoginResponseJTO login(String email, String password) {
        LoginMsg msg = new LoginMsg(email, password);
        msg = (LoginMsg) providerSendAndWait(msg);
        return msg.isInvalidCredentials() ? null : msg.getResult();
    }

    public void logout(String token) {
        LogoutMsg msg = new LogoutMsg(token);
        providerSendAndWait(msg);
    }

    public AuthenticatedUserJTO me(String token) {
        MeMsg msg = new MeMsg(token);
        msg = (MeMsg) providerSendAndWait(msg);
        return msg.getUser();
    }

    public List<DemoCredentialJTO> demoCredentials() {
        DemoCredentialsMsg msg = new DemoCredentialsMsg();
        msg = (DemoCredentialsMsg) providerSendAndWait(msg);
        return msg.getCredentials();
    }
}
