package com.amp.service.auth;

import atomatron.worker.service.Service;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.util.jsontransfer.DemoCredentialJTO;
import lombok.Getter;

import java.util.List;

public class AuthManager extends Service {
    @Getter
    private static final AuthManager sole = new AuthManager("AuthManager");

    private AuthManager(String name) {
        super(name);
    }

    /**
     * @return {@link IssuedSession} when credentials are valid, {@code null} when invalid.
     */
    public IssuedSession login(String email, String password) {
        LoginMsg msg = new LoginMsg(email, password);
        msg = (LoginMsg) providerSendAndWait(msg);
        return msg.isInvalidCredentials() ? null : msg.getResult();
    }

    /**
     * Rotates the refresh token family and mints a fresh access+csrf pair.
     * Returns {@code null} when the refresh token is unknown, revoked, or
     * expired — the action layer translates that into 401 and clears cookies.
     */
    public IssuedSession rotate(String refreshToken) {
        RefreshMsg msg = new RefreshMsg(refreshToken);
        msg = (RefreshMsg) providerSendAndWait(msg);
        return msg.getResult();
    }

    /** Revokes the entire session family backing this refresh token. */
    public void logout(String refreshToken) {
        LogoutMsg msg = new LogoutMsg(refreshToken);
        providerSendAndWait(msg);
    }

    public AuthenticatedUserJTO me(String accessToken) {
        MeMsg msg = new MeMsg(accessToken);
        msg = (MeMsg) providerSendAndWait(msg);
        return msg.getUser();
    }

    /**
     * Both the user and the csrf token bound to this access session. Returns
     * null when the access token is invalid/expired. Used by {@code AuthenticatedJsonAction}
     * so CSRF-related bookkeeping can stay in one place.
     */
    public MeMsg resolveSession(String accessToken) {
        MeMsg msg = new MeMsg(accessToken);
        return (MeMsg) providerSendAndWait(msg);
    }

    public List<DemoCredentialJTO> demoCredentials() {
        DemoCredentialsMsg msg = new DemoCredentialsMsg();
        msg = (DemoCredentialsMsg) providerSendAndWait(msg);
        return msg.getCredentials();
    }
}
