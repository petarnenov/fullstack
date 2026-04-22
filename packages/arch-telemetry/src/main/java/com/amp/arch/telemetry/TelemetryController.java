package com.amp.arch.telemetry;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Telemetry ingestion + live fan-out. This service exists only for the demo
 * visualiser and must accept posts from every MFE dev server (5173-5177) and
 * the visualiser itself (5199). `navigator.sendBeacon` always sends with
 * credentials mode `include`, so wildcard `*` origins are rejected by the
 * browser — we use `originPatterns` (host wildcard) + `allowCredentials=true`
 * so both `localhost` and the LAN IP set via `PUBLIC_HOST` in `.env` work.
 */
@RestController
@RequestMapping("/api/telemetry")
@CrossOrigin(
    originPatterns = {
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5199",
        "http://*:5173",
        "http://*:5174",
        "http://*:5175",
        "http://*:5176",
        "http://*:5177",
        "http://*:5199"
    },
    allowedHeaders = "*",
    allowCredentials = "true"
)
public class TelemetryController {

    private final EventStore store;

    public TelemetryController(EventStore store) {
        this.store = store;
    }

    @PostMapping(value = "/events", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, String> ingest(@RequestBody TelemetryEvent body) {
        TelemetryEvent event = new TelemetryEvent(
            body.id() != null ? body.id() : UUID.randomUUID().toString(),
            body.correlationId(),
            body.parentId(),
            body.kind(),
            body.from(),
            body.to(),
            body.team(),
            body.method(),
            body.path(),
            body.status(),
            body.durationMs(),
            body.meta(),
            body.timestamp() > 0 ? body.timestamp() : System.currentTimeMillis()
        );
        store.record(event);
        return Map.of("ok", "1", "id", event.id());
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return store.subscribe();
    }

    @GetMapping("/events/recent")
    public List<TelemetryEvent> recent(@RequestParam(defaultValue = "200") int limit) {
        return store.recent(limit);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "arch-telemetry");
    }
}
