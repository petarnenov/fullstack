package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class LogoutAction extends BasicJsonResponseAction {

    public String execute() {
        String token = extractBearerToken();
        if (token != null) {
            try {
                AuthManager.getSole().logout(token);
            } catch (Exception e) {
                log.warn("Logout failed for token; dropping session anyway", e);
            }
        }
        return empty(204);
    }
}
