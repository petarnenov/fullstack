package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.service.auth.IssuedSession;
import com.amp.util.jsontransfer.LoginRequestJTO;
import com.amp.util.jsontransfer.LoginResponseJTO;
import com.amp.web.common.SessionCookies;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;
import org.apache.struts2.ServletActionContext;

@Slf4j
public class LoginAction extends BasicJsonResponseAction {

    public String execute() {
        LoginRequestJTO body = parseJsonBody(LoginRequestJTO.class);
        if (body == null || body.getEmail() == null || body.getPassword() == null
                || body.getEmail().isBlank() || body.getPassword().isBlank()) {
            return error(400, "Invalid login payload");
        }

        try {
            IssuedSession session = AuthManager.getSole().login(body.getEmail(), body.getPassword());
            if (session == null) {
                return error(401, "Invalid email or password");
            }
            SessionCookies.setSessionCookies(ServletActionContext.getResponse(), session);
            LoginResponseJTO result = new LoginResponseJTO();
            result.setCsrfToken(session.getCsrfToken());
            result.setUser(session.getUser());
            return json(result);
        } catch (Exception e) {
            log.error("Login failed", e);
            return error(500, "Login failed");
        }
    }
}
