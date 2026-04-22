package com.amp.web.common.action;

import com.amp.service.auth.AuthManager;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import com.amp.web.common.SessionCookies;
import lombok.extern.slf4j.Slf4j;
import org.apache.struts2.ServletActionContext;

/**
 * Common base for every authenticated billing/accounts/trading action. The
 * access token is read from the httpOnly {@code amp_access_token} cookie; the
 * corresponding CSRF check is handled earlier by
 * {@link com.amp.web.common.CsrfFilter} (servlet-level, double-submit),
 * not here — by the time {@code executeAuthenticated()} runs the request has
 * already passed CSRF for unsafe methods.
 */
@Slf4j
public abstract class AuthenticatedJsonAction extends BasicJsonResponseAction {

    private AuthenticatedUserJTO authenticatedUser;

    public final String execute() {
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
            this.authenticatedUser = user;
        } catch (Exception e) {
            log.error("Auth check failed", e);
            return error(500, "Session lookup failed");
        }
        try {
            return executeAuthenticated();
        } catch (Exception e) {
            log.error("Action failed", e);
            return error(500, "Internal error");
        }
    }

    protected abstract String executeAuthenticated() throws Exception;

    protected AuthenticatedUserJTO getAuthenticatedUser() {
        return authenticatedUser;
    }
}
