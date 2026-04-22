package com.amp.service.auth;

import com.amp.util.jsontransfer.AuthenticatedUserJTO;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Everything a freshly-issued or rotated session needs. The access + refresh
 * tokens reach the browser via Set-Cookie only; the csrf token is mirrored
 * into the response body so the JS side can populate
 * {@code window.__AMP_PLATFORM__.csrfToken}. The two *ExpiresAtMs fields feed
 * the Max-Age cookie attribute — both cookies are httpOnly, so the browser
 * is the only thing that needs to know when they go stale.
 */
@Getter
@AllArgsConstructor
public class IssuedSession {
    private final String accessToken;
    private final String refreshToken;
    private final String csrfToken;
    private final long accessExpiresAtMs;
    private final long refreshExpiresAtMs;
    private final AuthenticatedUserJTO user;
}
