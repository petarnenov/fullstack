package com.amp.web.common;

import com.amp.util.GsonUtil;
import com.amp.util.jsontransfer.ErrorJTO;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Double-submit CSRF check. The JS layer reads the {@code amp_csrf_token}
 * cookie (SameSite=Strict + not httpOnly) and echoes the value in an
 * {@code X-CSRF-Token} header on every state-changing call. Cross-site
 * attackers can neither read the cookie (SameSite) nor set the header
 * (CORS preflight without credentials trust), so a match implies same-origin
 * intent.
 *
 * Scope: all unsafe methods under {@code /api/*}, minus {@code /api/auth/login}
 * (no session yet) and {@code /api/auth/demo-credentials} (read-only).
 */
public class CsrfFilter implements Filter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private static final String EXEMPT_LOGIN  = "/api/auth/login";

    @Override
    public void init(FilterConfig cfg) {}

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  request  = (HttpServletRequest)  req;
        HttpServletResponse response = (HttpServletResponse) res;

        String method = request.getMethod();
        String uri    = request.getRequestURI();

        if (!uri.startsWith("/api/")) { chain.doFilter(req, res); return; }
        if (SAFE_METHODS.contains(method)) { chain.doFilter(req, res); return; }
        if (uri.equals(EXEMPT_LOGIN)) { chain.doFilter(req, res); return; }

        String cookieToken = SessionCookies.readCookie(request, SessionCookies.CSRF_COOKIE);
        String headerToken = request.getHeader(SessionCookies.CSRF_HEADER);
        if (cookieToken == null || headerToken == null
                || cookieToken.isEmpty() || !cookieToken.equals(headerToken)) {
            writeError(response, 403, "CSRF token missing or invalid");
            return;
        }
        chain.doFilter(req, res);
    }

    @Override
    public void destroy() {}

    private static void writeError(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        byte[] body = GsonUtil.objectToString(new ErrorJTO(message)).getBytes(StandardCharsets.UTF_8);
        res.setContentLength(body.length);
        res.getOutputStream().write(body);
    }
}
