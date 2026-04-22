package com.amp.bff.reporting.telemetry;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import reactor.core.publisher.Mono;

/**
 * Attaches architecture-visualiser telemetry to every outbound call made by
 * the BFF's WebClient. The hero moment here is the fan-out: ReportAggregator
 * triggers ~3 parallel calls (accounts, invoices, portfolio*) and each one
 * emits request + response events linked by a shared parentId, which the
 * visualiser renders as a synchronised particle explosion.
 */
@Component
public class TelemetryWebClientFilter implements ExchangeFilterFunction {

    private static final String CORRELATION_HEADER = "X-Correlation-Id";
    private static final String PARENT_HEADER = "X-Parent-Correlation-Id";
    private static final String ME = "bff-reporting";

    private final TelemetryEmitter emitter;

    public TelemetryWebClientFilter(TelemetryEmitter emitter) {
        this.emitter = emitter;
    }

    @Override
    public Mono<org.springframework.web.reactive.function.client.ClientResponse> filter(
        ClientRequest request,
        org.springframework.web.reactive.function.client.ExchangeFunction next
    ) {
        String parentId = firstHeader(request, CORRELATION_HEADER);
        String childId = UUID.randomUUID().toString();
        String target = targetFor(request.url().getPath());
        String team = teamFor(target);

        ClientRequest updated = ClientRequest.from(request)
            .headers(h -> {
                h.set(CORRELATION_HEADER, childId);
                if (parentId != null) h.set(PARENT_HEADER, parentId);
            })
            .build();

        long started = System.nanoTime();

        Map<String, Object> req = new HashMap<>();
        req.put("kind", "request");
        req.put("correlationId", childId);
        if (parentId != null) req.put("parentId", parentId);
        req.put("from", ME);
        req.put("to", target);
        req.put("team", team);
        req.put("method", request.method().name());
        req.put("path", request.url().getPath());
        emitter.emit(req);

        return next.exchange(updated).doOnNext(response -> {
            long durationMs = (System.nanoTime() - started) / 1_000_000;
            HttpStatusCode status = response.statusCode();
            Map<String, Object> resp = new HashMap<>();
            resp.put("kind", "response");
            resp.put("correlationId", childId);
            if (parentId != null) resp.put("parentId", parentId);
            resp.put("from", target);
            resp.put("to", ME);
            resp.put("team", team);
            resp.put("method", request.method().name());
            resp.put("path", request.url().getPath());
            resp.put("status", status.value());
            resp.put("durationMs", durationMs);
            emitter.emit(resp);
        }).doOnError(err -> {
            long durationMs = (System.nanoTime() - started) / 1_000_000;
            Map<String, Object> resp = new HashMap<>();
            resp.put("kind", "response");
            resp.put("correlationId", childId);
            if (parentId != null) resp.put("parentId", parentId);
            resp.put("from", target);
            resp.put("to", ME);
            resp.put("team", team);
            resp.put("method", request.method().name());
            resp.put("path", request.url().getPath());
            resp.put("status", 0);
            resp.put("durationMs", durationMs);
            resp.put("meta", Map.of("error", err.getClass().getSimpleName()));
            emitter.emit(resp);
        });
    }

    private static String firstHeader(ClientRequest req, String name) {
        var values = req.headers().get(name);
        return (values == null || values.isEmpty()) ? null : values.get(0);
    }

    private static String targetFor(String path) {
        if (path.startsWith("/api/accounts")) return "api-java:accounts";
        if (path.startsWith("/api/billing")) return "api-java:billing";
        if (path.startsWith("/api/trading")) return "api-java:trading";
        if (path.startsWith("/api/auth")) return "api-java:auth";
        return "api-java";
    }

    private static String teamFor(String target) {
        return switch (target) {
            case "api-java:accounts" -> "accounts";
            case "api-java:billing" -> "billing";
            case "api-java:trading" -> "trading";
            case "api-java:auth" -> "platform";
            default -> "infra";
        };
    }
}
