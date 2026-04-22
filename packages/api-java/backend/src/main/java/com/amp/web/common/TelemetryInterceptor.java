package com.amp.web.common;

import com.google.gson.Gson;
import com.opensymphony.xwork2.ActionInvocation;
import com.opensymphony.xwork2.interceptor.AbstractInterceptor;
import javax.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.apache.struts2.ServletActionContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Emits request + response events to the architecture visualiser for every
 * action invocation. Fire-and-forget POST to :8091 via the JDK async HTTP
 * client. Telemetry must never affect request handling, so every path below
 * swallows exceptions.
 *
 * ME is derived per-request from the action namespace (e.g. "/api/billing" →
 * "api-java:billing"), so a single interceptor instance covers all four
 * domains without per-package configuration.
 */
public class TelemetryInterceptor extends AbstractInterceptor {

    private static final long serialVersionUID = 1L;
    private static final Logger log = LoggerFactory.getLogger(TelemetryInterceptor.class);
    private static final String CORRELATION_HEADER = "X-Correlation-Id";

    private static final String ENDPOINT = System.getProperty(
        "amp.telemetry.url",
        "http://localhost:8091/api/telemetry/events"
    );

    private static final HttpClient HTTP = HttpClient.newBuilder()
        .connectTimeout(Duration.ofMillis(300))
        .build();
    private static final Gson GSON = new Gson();

    @Override
    public String intercept(ActionInvocation invocation) throws Exception {
        HttpServletRequest req = ServletActionContext.getRequest();
        String uri = req != null ? req.getRequestURI() : "";
        String incomingCid = req != null ? req.getHeader(CORRELATION_HEADER) : null;
        String cid = incomingCid != null && !incomingCid.isBlank()
            ? incomingCid
            : UUID.randomUUID().toString();
        String method = req != null ? req.getMethod() : "GET";
        String parentCid = req != null ? req.getHeader("X-Parent-Correlation-Id") : null;
        String caller = deriveCaller(req, uri);
        String me = targetFor(uri);
        String team = teamFor(me);

        emit(event(Map.of(
            "kind", "request",
            "correlationId", cid,
            "from", caller,
            "to", me,
            "team", team,
            "method", method,
            "path", uri
        ), parentCid));

        long started = System.nanoTime();
        int status = 200;
        try {
            return invocation.invoke();
        } catch (Exception e) {
            status = 500;
            throw e;
        } finally {
            long durationMs = (System.nanoTime() - started) / 1_000_000;
            int httpStatus = ServletActionContext.getResponse() != null
                ? ServletActionContext.getResponse().getStatus()
                : status;
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("kind", "response");
            resp.put("correlationId", cid);
            resp.put("from", me);
            resp.put("to", caller);
            resp.put("team", team);
            resp.put("method", method);
            resp.put("path", uri);
            resp.put("status", httpStatus);
            resp.put("durationMs", durationMs);
            emit(event(resp, parentCid));
        }
    }

    private static Map<String, Object> event(Map<String, Object> base, String parentCid) {
        Map<String, Object> m = new LinkedHashMap<>(base);
        if (parentCid != null && !parentCid.isBlank()) m.put("parentId", parentCid);
        m.putIfAbsent("timestamp", System.currentTimeMillis());
        return m;
    }

    /**
     * Infer the caller from the inbound request. The BFF sets a custom User-
     * Agent-ish header in the WebClient filter; for now we key off the
     * presence of X-Parent-Correlation-Id, which is only emitted by
     * bff-reporting's fan-out.
     */
    private static String deriveCaller(HttpServletRequest req, String uri) {
        if (req == null) return "shell";
        String parent = req.getHeader("X-Parent-Correlation-Id");
        if (parent != null && !parent.isBlank()) return "bff-reporting";
        if (uri.startsWith("/api/auth")) return "shell";
        if (uri.startsWith("/api/billing")) return "mfe-billing";
        if (uri.startsWith("/api/accounts")) return "mfe-open-account";
        if (uri.startsWith("/api/trading")) return "mfe-trading";
        return "shell";
    }

    private static String targetFor(String uri) {
        if (uri.startsWith("/api/auth")) return "api-java:auth";
        if (uri.startsWith("/api/billing")) return "api-java:billing";
        if (uri.startsWith("/api/accounts")) return "api-java:accounts";
        if (uri.startsWith("/api/trading")) return "api-java:trading";
        return "api-java";
    }

    private static String teamFor(String target) {
        return switch (target) {
            case "api-java:billing" -> "billing";
            case "api-java:accounts" -> "accounts";
            case "api-java:trading" -> "trading";
            case "api-java:auth" -> "platform";
            default -> "infra";
        };
    }

    private static void emit(Map<String, Object> event) {
        try {
            Map<String, Object> payload = new HashMap<>(event);
            String body = GSON.toJson(payload);
            HttpRequest req = HttpRequest.newBuilder(URI.create(ENDPOINT))
                .timeout(Duration.ofMillis(500))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
            HTTP.sendAsync(req, HttpResponse.BodyHandlers.discarding())
                .exceptionally(e -> {
                    log.trace("telemetry emit failed: {}", e.getMessage());
                    return null;
                });
        } catch (Exception e) {
            log.trace("telemetry emit dropped: {}", e.getMessage());
        }
    }
}
