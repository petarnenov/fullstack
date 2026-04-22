package com.amp.web.common.action;

import com.amp.service.auth.AuthManager;
import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import lombok.extern.slf4j.Slf4j;

/**
 * Mirrors the Node `requireAuth` middleware mounted on billing/accounts/trading
 * routers. Subclasses implement {@link #executeAuthenticated()} and can access
 * the resolved user via {@link #getAuthenticatedUser()}.
 */
@Slf4j
public abstract class AuthenticatedJsonAction extends BasicJsonResponseAction {

    private AuthenticatedUserJTO authenticatedUser;

    public final String execute() {
        String token = extractBearerToken();
        if (token == null) {
            return error(401, "Missing or malformed Authorization header");
        }
        try {
            AuthenticatedUserJTO user = AuthManager.getSole().me(token);
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
