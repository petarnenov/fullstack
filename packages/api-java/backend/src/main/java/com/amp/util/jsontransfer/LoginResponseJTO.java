package com.amp.util.jsontransfer;

import lombok.Getter;
import lombok.Setter;

/**
 * Wire-shape returned by /api/auth/login and /api/auth/refresh. The access
 * + refresh tokens are transported in httpOnly cookies and never serialized
 * into this body. Only the csrf token (double-submit cookie value) and the
 * authenticated user reach JS — this is what the shell stores on
 * {@code window.__AMP_PLATFORM__} so MFEs can echo it as X-CSRF-Token.
 */
@Getter
@Setter
public class LoginResponseJTO extends AbstractJTO {
    private String csrfToken;
    private AuthenticatedUserJTO user;
}
