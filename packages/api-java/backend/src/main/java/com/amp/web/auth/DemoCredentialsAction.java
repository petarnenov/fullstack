package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class DemoCredentialsAction extends BasicJsonResponseAction {

    public String execute() {
        try {
            return json(AuthManager.getSole().demoCredentials());
        } catch (Exception e) {
            log.error("demo-credentials failed", e);
            return error(500, "Lookup failed");
        }
    }
}
