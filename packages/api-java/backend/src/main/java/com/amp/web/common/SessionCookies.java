package com.amp.web.common;

import com.amp.service.auth.IssuedSession;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Three-cookie session transport. The two token cookies are httpOnly so JS
 * can never read them — the browser carries them automatically on every
 * request to the matching path. The csrf cookie is JS-readable on purpose:
 * the shell mirrors it into {@code window.__AMP_PLATFORM__.csrfToken} so
 * MFEs can echo it in the X-CSRF-Token header on state-changing writes
 * (double-submit pattern — see {@link CsrfFilter}).
 *
 * SameSite=strict on refresh + csrf gives us CSRF-by-design on the refresh
 * endpoint; access cookie is SameSite=lax so top-level navigations into the
 * app still have a session. Servlet 3.1's {@link Cookie} API doesn't expose
 * SameSite, so we write the Set-Cookie header by hand.
 */
public final class SessionCookies {

    public static final String ACCESS_COOKIE  = "amp_access_token";
    public static final String REFRESH_COOKIE = "amp_refresh_token";
    public static final String CSRF_COOKIE    = "amp_csrf_token";
    public static final String CSRF_HEADER    = "X-CSRF-Token";

    private static final String ACCESS_PATH  = "/api";
    private static final String REFRESH_PATH = "/api/auth";
    private static final String CSRF_PATH    = "/";

    private SessionCookies() {}

    public static void setSessionCookies(HttpServletResponse res, IssuedSession session) {
        long now = System.currentTimeMillis();
        long accessMaxAge  = Math.max((session.getAccessExpiresAtMs()  - now) / 1000, 0);
        long refreshMaxAge = Math.max((session.getRefreshExpiresAtMs() - now) / 1000, 0);

        res.addHeader("Set-Cookie",
                buildCookie(ACCESS_COOKIE,  session.getAccessToken(),  ACCESS_PATH,  accessMaxAge,  true,  "Lax"));
        res.addHeader("Set-Cookie",
                buildCookie(REFRESH_COOKIE, session.getRefreshToken(), REFRESH_PATH, refreshMaxAge, true,  "Strict"));
        res.addHeader("Set-Cookie",
                buildCookie(CSRF_COOKIE,    session.getCsrfToken(),    CSRF_PATH,    refreshMaxAge, false, "Strict"));
    }

    public static void clearSessionCookies(HttpServletResponse res) {
        res.addHeader("Set-Cookie", buildCookie(ACCESS_COOKIE,  "", ACCESS_PATH,  0, true,  "Lax"));
        res.addHeader("Set-Cookie", buildCookie(REFRESH_COOKIE, "", REFRESH_PATH, 0, true,  "Strict"));
        res.addHeader("Set-Cookie", buildCookie(CSRF_COOKIE,    "", CSRF_PATH,    0, false, "Strict"));
    }

    public static String readCookie(HttpServletRequest req, String name) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if (name.equals(c.getName())) return c.getValue();
        }
        return null;
    }

    private static String buildCookie(String name, String value, String path,
                                       long maxAgeSeconds, boolean httpOnly, String sameSite) {
        StringBuilder sb = new StringBuilder();
        sb.append(name).append('=').append(value == null ? "" : value);
        sb.append("; Path=").append(path);
        sb.append("; Max-Age=").append(maxAgeSeconds);
        sb.append("; SameSite=").append(sameSite);
        if (httpOnly) sb.append("; HttpOnly");
        // Dev demo runs over plain http (including LAN); flip to Secure via
        // a system prop if/when this migrates behind TLS.
        if (Boolean.getBoolean("amp.auth.secureCookies")) sb.append("; Secure");
        return sb.toString();
    }
}
