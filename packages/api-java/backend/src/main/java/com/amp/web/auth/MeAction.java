package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class MeAction extends BasicJsonResponseAction {

    public String execute() {
        String token = extractBearerToken();
        if (token == null) {
            return error(401, "Missing or malformed Authorization header");
        }
        try {
            AuthenticatedUserJTO user = AuthManager.getSole().me(token);
            if (user == null) {
                return error(401, "Invalid or expired session");
            }
            return json(user);
        } catch (Exception e) {
            log.error("me lookup failed", e);
            return error(500, "Session lookup failed");
        }
    }
}
