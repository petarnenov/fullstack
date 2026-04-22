package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.util.jsontransfer.LoginRequestJTO;
import com.amp.util.jsontransfer.LoginResponseJTO;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class LoginAction extends BasicJsonResponseAction {

    public String execute() {
        LoginRequestJTO body = parseJsonBody(LoginRequestJTO.class);
        if (body == null || body.getEmail() == null || body.getPassword() == null
                || body.getEmail().isBlank() || body.getPassword().isBlank()) {
            return error(400, "Invalid login payload");
        }

        try {
            LoginResponseJTO result = AuthManager.getSole().login(body.getEmail(), body.getPassword());
            if (result == null) {
                return error(401, "Invalid email or password");
            }
            return json(result);
        } catch (Exception e) {
            log.error("Login failed", e);
            return error(500, "Login failed");
        }
    }
}
