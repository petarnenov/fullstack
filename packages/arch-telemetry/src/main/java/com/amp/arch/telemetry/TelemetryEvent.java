package com.amp.arch.telemetry;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * A single event in the architecture visualiser feed. Every field except id,
 * kind, from, to and timestamp is optional; clients fill in what they have.
 *
 * correlationId: ties a request to its response. Parent correlation id on
 *   child events (BFF fan-out) allows the visualiser to render a fan-out as a
 *   single grouped animation.
 * parentId: set on BFF → monolith outbound calls; equals the MFE → BFF
 *   correlationId that triggered the fan-out.
 * kind: "request" | "response" | "invalidate" | "lazy-load"
 * from/to: node identifiers in the topology (e.g. "shell", "mfe-billing",
 *   "bff-reporting", "api-java:billing", "queryClient").
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TelemetryEvent(
    String id,
    String correlationId,
    String parentId,
    String kind,
    String from,
    String to,
    String team,
    String method,
    String path,
    Integer status,
    Long durationMs,
    Map<String, Object> meta,
    long timestamp
) {}
