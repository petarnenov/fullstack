package com.amp.web.auth;

import com.amp.service.auth.AuthManager;
import com.amp.service.auth.IssuedSession;
import com.amp.util.jsontransfer.LoginResponseJTO;
import com.amp.web.common.SessionCookies;
import com.amp.web.common.action.BasicJsonResponseAction;
import lombok.extern.slf4j.Slf4j;
import org.apache.struts2.ServletActionContext;

/**
 * Rotates the refresh token family and mints a fresh access+csrf pair. CSRF
 * is checked by {@link com.amp.web.common.CsrfFilter} before Struts sees the
 * request, so this action only handles the happy path + "refresh gone" fallback.
 */
@Slf4j
public class RefreshAction extends BasicJsonResponseAction {

    public String execute() {
        String refreshToken = SessionCookies.readCookie(
                ServletActionContext.getRequest(), SessionCookies.REFRESH_COOKIE);
        if (refreshToken == null || refreshToken.isBlank()) {
            SessionCookies.clearSessionCookies(ServletActionContext.getResponse());
            return error(401, "No refresh token");
        }
        try {
            IssuedSession session = AuthManager.getSole().rotate(refreshToken);
            if (session == null) {
                SessionCookies.clearSessionCookies(ServletActionContext.getResponse());
                return error(401, "Invalid refresh token");
            }
            SessionCookies.setSessionCookies(ServletActionContext.getResponse(), session);
            LoginResponseJTO result = new LoginResponseJTO();
            result.setCsrfToken(session.getCsrfToken());
            result.setUser(session.getUser());
            return json(result);
        } catch (Exception e) {
            log.error("Refresh failed", e);
            return error(500, "Refresh failed");
        }
    }
}
