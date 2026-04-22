package com.amp.bff.reporting.telemetry;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Fire-and-forget POST to arch-telemetry :8091. Sends via the JDK HttpClient
 * async API so the outbound chain in ReportAggregator never blocks on
 * observability. Failures are silent — telemetry must never affect the demo.
 */
@Component
public class TelemetryEmitter {

    private static final Logger log = LoggerFactory.getLogger(TelemetryEmitter.class);

    private final HttpClient http = HttpClient.newBuilder()
        .connectTimeout(Duration.ofMillis(300))
        .build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final URI endpoint;

    public TelemetryEmitter(@Value("${amp.telemetry.url:http://localhost:8091/api/telemetry/events}") String url) {
        this.endpoint = URI.create(url);
    }

    public void emit(Map<String, Object> event) {
        try {
            Map<String, Object> payload = new HashMap<>(event);
            payload.putIfAbsent("timestamp", System.currentTimeMillis());
            String body = mapper.writeValueAsString(payload);
            HttpRequest req = HttpRequest.newBuilder(endpoint)
                .timeout(Duration.ofMillis(500))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
            http.sendAsync(req, HttpResponse.BodyHandlers.discarding())
                .exceptionally(e -> {
                    log.trace("telemetry emit failed: {}", e.getMessage());
                    return null;
                });
        } catch (Exception e) {
            log.trace("telemetry emit dropped: {}", e.getMessage());
        }
    }
}
