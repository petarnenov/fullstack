package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.web.common.SessionCookies;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;
import org.apache.struts2.ServletActionContext;

@Slf4j
public class MeAction extends BasicJsonResponseAction {

    public String execute() {
        String accessToken = SessionCookies.readCookie(
                ServletActionContext.getRequest(), SessionCookies.ACCESS_COOKIE);
        if (accessToken == null) {
            return error(401, "Not authenticated");
        }
        try {
            AuthenticatedUserJTO user = AuthManager.getSole().me(accessToken);
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
