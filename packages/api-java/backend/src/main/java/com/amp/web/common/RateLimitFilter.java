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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window per-IP limiter for the two auth endpoints where brute-force
 * is cheap: /login (10/min) and /refresh (30/min). Hand-rolled because the
 * monolith has no DI container that would let us plug in Bucket4j cleanly
 * at filter level; accuracy at window boundaries is fine for a demo-scale
 * attack shield and still surfaces a 429 to the client.
 */
public class RateLimitFilter implements Filter {

    private static final long WINDOW_MS = 60_000;
    private static final int LIMIT_LOGIN   = 10;
    private static final int LIMIT_REFRESH = 30;

    private static final Map<String, Counter> COUNTERS = new ConcurrentHashMap<>();

    @Override
    public void init(FilterConfig cfg) {}

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  request  = (HttpServletRequest)  req;
        HttpServletResponse response = (HttpServletResponse) res;

        int limit = limitFor(request.getRequestURI(), request.getMethod());
        if (limit <= 0) { chain.doFilter(req, res); return; }

        String key = clientIp(request) + "::" + request.getRequestURI();
        long now = System.currentTimeMillis();
        Counter counter = COUNTERS.computeIfAbsent(key, k -> new Counter(now));
        int count;
        synchronized (counter) {
            if (now - counter.windowStart >= WINDOW_MS) {
                counter.windowStart = now;
                counter.count.set(0);
            }
            count = counter.count.incrementAndGet();
        }
        if (count > limit) {
            long retryAfter = Math.max((counter.windowStart + WINDOW_MS - now) / 1000, 1);
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            writeError(response, 429,
                    isLogin(request.getRequestURI()) ? "Too many login attempts, slow down and retry shortly"
                                                      : "Refresh flood detected, slow down");
            return;
        }
        chain.doFilter(req, res);
    }

    @Override
    public void destroy() { COUNTERS.clear(); }

    private static int limitFor(String uri, String method) {
        if (!"POST".equalsIgnoreCase(method)) return 0;
        if ("/api/auth/login".equals(uri)) return LIMIT_LOGIN;
        if ("/api/auth/refresh".equals(uri)) return LIMIT_REFRESH;
        return 0;
    }

    private static boolean isLogin(String uri) { return "/api/auth/login".equals(uri); }

    private static String clientIp(HttpServletRequest req) {
        String xf = req.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            int comma = xf.indexOf(',');
            return (comma < 0 ? xf : xf.substring(0, comma)).trim();
        }
        return req.getRemoteAddr();
    }

    private static void writeError(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        byte[] body = GsonUtil.objectToString(new ErrorJTO(message)).getBytes(StandardCharsets.UTF_8);
        res.setContentLength(body.length);
        res.getOutputStream().write(body);
    }

    private static final class Counter {
        volatile long windowStart;
        final AtomicInteger count = new AtomicInteger(0);
        Counter(long start) { this.windowStart = start; }
    }
}
