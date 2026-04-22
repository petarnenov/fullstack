package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.web.common.SessionCookies;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;
import org.apache.struts2.ServletActionContext;

@Slf4j
public class LogoutAction extends BasicJsonResponseAction {

    public String execute() {
        String refreshToken = SessionCookies.readCookie(
                ServletActionContext.getRequest(), SessionCookies.REFRESH_COOKIE);
        if (refreshToken != null) {
            try {
                AuthManager.getSole().logout(refreshToken);
            } catch (Exception e) {
                log.warn("Logout failed for refresh token; clearing cookies anyway", e);
            }
        }
        SessionCookies.clearSessionCookies(ServletActionContext.getResponse());
        return empty(204);
    }
}
